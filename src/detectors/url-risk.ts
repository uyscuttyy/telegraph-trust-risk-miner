import { domainToUnicode } from "node:url";
import type { AnalysisInput, Detector, DetectorContext, Evidence, ProviderResult, ReputationProvider, SignalResult } from "../core/types.js";

export interface UrlInspection { url: URL; hostname: string; unicodeHostname: string; isIpHost: boolean; labels: string[]; tld: string; }
export interface RedirectProvider { readonly name: string; inspect(url: URL, context: DetectorContext): Promise<ProviderResult>; }
export interface TlsProvider { readonly name: string; inspect(hostname: string, context: DetectorContext): Promise<ProviderResult>; }
export interface UrlRiskOptions { reputationProviders?: readonly ReputationProvider[]; redirectProviders?: readonly RedirectProvider[]; tlsProviders?: readonly TlsProvider[]; brands?: readonly string[]; }

const DEFAULT_BRANDS = ["google", "microsoft", "apple", "amazon", "paypal", "coinbase", "binance", "metamask", "telegram", "discord"];
const HIGH_ABUSE_TLDS = new Set(["zip", "mov", "top", "click", "work", "support", "country", "gq", "tk"]);

export class UrlRiskDetector implements Detector {
  readonly name = "url-website-risk-v1";
  constructor(private readonly options: UrlRiskOptions = {}) {}
  supports(input: AnalysisInput): boolean { return input.intent === "URL_SCAN"; }
  async analyze(input: AnalysisInput, context: DetectorContext): Promise<SignalResult> {
    if (input.intent !== "URL_SCAN") throw new Error(`${this.name} does not support ${input.intent}`);
    const inspection = inspectUrl(input.url); const findings = localFindings(inspection, this.options.brands ?? DEFAULT_BRANDS);
    const evidence: Evidence[] = findings.map(item => ({ ...item, kind: item.kind ?? "heuristic", status: "available", weight: item.weight / 100, supportsRisk: true }));
    const limitations: string[] = [];
    for (const provider of this.options.reputationProviders ?? []) await collect(provider.name, () => provider.lookup(inspection.hostname, context), evidence, limitations);
    for (const provider of this.options.redirectProviders ?? []) await collect(provider.name, () => provider.inspect(inspection.url, context), evidence, limitations);
    for (const provider of this.options.tlsProviders ?? []) await collect(provider.name, () => provider.inspect(inspection.hostname, context), evidence, limitations);
    if (!this.options.reputationProviders?.length) limitations.push("No reputation provider configured");
    if (!this.options.redirectProviders?.length) limitations.push("No redirect provider configured");
    if (!this.options.tlsProviders?.length) limitations.push("No TLS inspection provider configured");
    const riskScore = Math.min(100, Math.round(5 + findings.reduce((sum, item) => sum + item.weight, 0)));
    const confidence = Math.min(0.95, 0.58 + Math.min(findings.length, 5) * 0.06 + (evidence.length > findings.length ? 0.08 : 0));
    return { intent: "URL_SCAN", status: "available", riskScore, confidence, riskLevel: riskLevel(riskScore), verdict: riskScore >= 60 ? "unsafe" : riskScore >= 35 ? "suspicious" : "likely_safe", evidence, limitations };
  }
}

export function inspectUrl(raw: string): UrlInspection {
  const url = new URL(raw); const hostname = url.hostname.toLowerCase(); const unicodeHostname = domainToUnicode(hostname); const labels = hostname.split(".");
  return { url, hostname, unicodeHostname, isIpHost: /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":"), labels, tld: labels.at(-1) ?? "" };
}
export function isSafeExternalTarget(url: URL): boolean { return (url.protocol === "https:" || url.protocol === "http:") && !isPrivateHost(url.hostname); }
function isPrivateHost(host: string): boolean { const value = host.toLowerCase(); return value === "localhost" || value === "::1" || value.endsWith(".localhost") || value.endsWith(".local") || /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value); }
function localFindings(item: UrlInspection, brands: readonly string[]) {
  const findings: Array<{ id: string; title: string; detail: string; weight: number; kind?: Evidence["kind"] }> = [];
  if (item.url.protocol === "http:") findings.push({ id: "url-http", title: "Unencrypted transport", detail: "The URL uses HTTP rather than HTTPS.", weight: 12, kind: "metadata" });
  if (item.isIpHost) findings.push({ id: "url-ip-host", title: "IP-address host", detail: "The URL uses a numeric address instead of a registered domain.", weight: 25 });
  if (item.hostname.includes("xn--") || item.unicodeHostname !== item.hostname) findings.push({ id: "url-unicode-host", title: "Internationalized hostname", detail: `Decoded hostname: ${item.unicodeHostname}`, weight: 35 });
  if (item.labels.length > 4) findings.push({ id: "url-subdomains", title: "Excessive subdomains", detail: `The hostname contains ${item.labels.length} labels.`, weight: 10 });
  if (HIGH_ABUSE_TLDS.has(item.tld)) findings.push({ id: "url-tld", title: "Higher-risk top-level domain", detail: `The .${item.tld} suffix is frequently abused in disposable campaigns.`, weight: 10 });
  if (item.url.username || item.url.password) findings.push({ id: "url-userinfo", title: "Misleading URL user-info", detail: "User-info syntax can obscure the actual destination.", weight: 35 });
  if (/%[0-9a-f]{2}/i.test(item.url.href)) findings.push({ id: "url-encoding", title: "Encoded URL components", detail: "Percent encoding may obscure the destination or path.", weight: 8 });
  if (/(verify|secure|update|unlock|recover|claim|airdrop|wallet|seed|login|signin)/i.test(`${item.url.pathname} ${item.url.search}`)) findings.push({ id: "url-sensitive-path", title: "Sensitive-action path", detail: "The path requests authentication, recovery, verification, or asset claiming.", weight: 15 });
  for (const brand of brands) if (item.hostname.includes(brand) && item.hostname !== `${brand}.com` && !item.hostname.endsWith(`.${brand}.com`)) { findings.push({ id: "url-brand-mismatch", title: "Possible brand impersonation", detail: `The hostname contains '${brand}' outside ${brand}.com.`, weight: 25 }); break; }
  const registrableLabel = item.labels.length >= 2 ? item.labels.at(-2) ?? "" : item.labels[0];
  const folded = registrableLabel.replace(/0/g, "o").replace(/1|l/g, "i").replace(/3/g, "e").replace(/5/g, "s").replace(/7/g, "t").replace(/-/g, "");
  for (const brand of brands) if (registrableLabel !== brand && (folded === brand || levenshtein(folded, brand) === 1)) { findings.push({ id: "url-typosquat", title: "Possible typosquatting", detail: `The domain label '${registrableLabel}' closely resembles '${brand}'.`, weight: 40 }); break; }
  return findings;
}
function riskLevel(score: number): "minimal" | "low" | "medium" | "high" | "critical" { return score >= 80 ? "critical" : score >= 60 ? "high" : score >= 35 ? "medium" : score >= 15 ? "low" : "minimal"; }
async function collect(name: string, operation: () => Promise<ProviderResult>, evidence: Evidence[], limitations: string[]): Promise<void> { try { const result = await operation(); evidence.push(...result.evidence); if (result.status !== "available") limitations.push(`${name}: ${result.error ?? result.status}`); } catch { limitations.push(`${name}: provider failed`); } }
function levenshtein(a: string, b: string): number { const row = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = old; } } return row[b.length]; }
