import type { AnalysisInput, Detector, DetectorContext, Evidence, SignalResult } from "../core/types.js";

interface Finding { id: string; title: string; detail: string; weight: number; kind?: Evidence["kind"]; }
const SUSPICIOUS_TLDS = new Set(["zip", "mov", "top", "click", "work", "support", "country", "gq", "tk"]);
const BRANDS = ["google", "microsoft", "apple", "amazon", "paypal", "coinbase", "binance", "metamask", "telegram", "discord"];

export class PhishingScamDetector implements Detector {
  readonly name = "phishing-scam-heuristics-v1";
  supports(input: AnalysisInput): boolean { return input.intent === "URL_SCAN" || input.intent === "CONTENT_VERIFICATION"; }
  async analyze(input: AnalysisInput, _context: DetectorContext): Promise<SignalResult> {
    if (input.intent !== "URL_SCAN" && input.intent !== "CONTENT_VERIFICATION") throw new Error(`${this.name} does not support ${input.intent}`);
    const findings = input.intent === "URL_SCAN" ? analyzeUrl(input.url) : analyzeContent(input.content);
    const riskScore = Math.min(100, Math.round(5 + findings.reduce((sum, item) => sum + item.weight, 0)));
    const confidence = Math.min(0.9, 0.55 + Math.min(findings.length, 5) * 0.07);
    const riskLevel = riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 35 ? "medium" : riskScore >= 15 ? "low" : "minimal";
    return {
      intent: input.intent, status: "available", riskScore, confidence, riskLevel,
      verdict: riskScore >= 60 ? "unsafe" : riskScore >= 35 ? "suspicious" : "likely_safe",
      evidence: findings.map(item => ({ id: item.id, kind: item.kind ?? "heuristic", title: item.title, detail: item.detail, status: "available", weight: item.weight / 100, supportsRisk: true })),
      limitations: input.intent === "URL_SCAN" ? ["No external reputation, domain-age, redirect, TLS, or page-content lookup was performed"] : ["Text heuristics cannot establish sender identity or intent"],
    };
  }
}

function analyzeUrl(rawUrl: string): Finding[] {
  const url = new URL(rawUrl); const host = url.hostname.toLowerCase(); const findings: Finding[] = [];
  if (url.protocol === "http:") findings.push(f("url-http", "Unencrypted transport", "The URL uses HTTP rather than HTTPS.", 12, "metadata"));
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) findings.push(f("url-ip-host", "IP-address host", "The URL uses a numeric address instead of a domain.", 25));
  if (host.includes("xn--")) findings.push(f("url-punycode", "Punycode hostname", "The hostname can contain homograph characters.", 34));
  if (url.username || url.password || rawUrl.includes("@")) findings.push(f("url-userinfo", "Misleading user information", "User-info syntax can obscure the real destination.", 24));
  const labels = host.split("."); if (labels.length > 4) findings.push(f("url-subdomains", "Excessive subdomains", `The hostname contains ${labels.length} labels.`, 12));
  const tld = labels.at(-1) ?? ""; if (SUSPICIOUS_TLDS.has(tld)) findings.push(f("url-tld", "Higher-risk top-level domain", `The .${tld} suffix is frequently abused in disposable campaigns.`, 10));
  if (/%[0-9a-f]{2}/i.test(rawUrl)) findings.push(f("url-encoding", "Encoded URL components", "Percent encoding may obscure the path.", 9));
  const path = `${url.pathname} ${url.search}`.toLowerCase(); if (/(verify|secure|update|unlock|recover|claim|airdrop|wallet|seed|login|signin)/.test(path)) findings.push(f("url-sensitive-path", "Sensitive-action path", "The path requests authentication, recovery, verification, or asset claiming.", 12));
  for (const brand of BRANDS) if (host.includes(brand) && host !== `${brand}.com` && !host.endsWith(`.${brand}.com`)) { findings.push(f("url-brand-mismatch", "Possible brand impersonation", `The hostname contains '${brand}' outside ${brand}.com.`, 28)); break; }
  if (host.length > 50 || /-{3,}/.test(host)) findings.push(f("url-host-complexity", "Unusually complex hostname", "The hostname is unusually long or heavily hyphenated.", 8));
  return findings;
}

function analyzeContent(content: string): Finding[] {
  const text = content.toLowerCase(); const findings: Finding[] = [];
  const educational = /(training|example|awareness|never share|never request|do not share|warning signs|report phishing)/.test(text);
  const weight = (normal: number) => educational ? Math.min(5, normal) : normal;
  if (/(urgent|immediately|within \d+ (minutes|hours)|account (will be|is) (closed|suspended|locked)|final warning)/.test(text)) findings.push(f("text-urgency", "Urgency or threat", "The message pressures the recipient to act quickly.", weight(18)));
  if (/(password|passcode|one[- ]time code|otp|seed phrase|recovery phrase|private key|login credentials)/.test(text)) findings.push(f("text-credentials", "Credential request", "The message references sensitive authentication or wallet material.", weight(26)));
  if (/(send|pay|transfer|deposit).{0,30}(crypto|bitcoin|btc|eth|usdc|gift card|wire|fee)/s.test(text)) findings.push(f("text-payment", "Unusual payment request", "The message requests a difficult-to-reverse payment.", weight(24)));
  if (/(guaranteed returns?|double your|risk[- ]free profit|limited presale|exclusive investment)/.test(text)) findings.push(f("text-investment", "Implausible investment promise", "The message promises guaranteed or unusually high returns.", weight(24)));
  if (/(airdrop|giveaway|reward|prize).{0,40}(claim|connect|wallet|fee|send)/s.test(text)) findings.push(f("text-giveaway", "Giveaway or airdrop lure", "A reward is tied to wallet connection, payment, or immediate claiming.", weight(22)));
  if (/(support team|security department|administrator|ceo|government|tax authority).{0,50}(contacted|request|need|verify|send|pay)/s.test(text)) findings.push(f("text-impersonation", "Authority impersonation pattern", "The sender claims authority while requesting action.", weight(18)));
  if (/(keep this confidential|do not tell|bypass|ignore previous|move to telegram|message me privately)/.test(text)) findings.push(f("text-isolation", "Isolation or evasion request", "The message discourages independent verification.", weight(16)));
  return findings;
}
function f(id: string, title: string, detail: string, weight: number, kind?: Evidence["kind"]): Finding { return { id, title, detail, weight, kind }; }
