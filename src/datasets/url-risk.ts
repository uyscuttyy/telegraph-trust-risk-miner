import type { EvaluationCase } from "../evaluation/types.js";

const provenance = { sourceType: "synthetic" as const, source: "Phase 5 hand-authored URL fixtures", collectedAt: "2026-08-14T00:00:00Z" };
export const urlRiskCases: EvaluationCase[] = [
  { id: "url5-example", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://example.com/about" }, groundTruth: { label: "safe", risk: 5, confidence: 0.95, rationale: "Reserved example domain." }, provenance, tags: ["safe"] },
  { id: "url5-google", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://accounts.google.com/signin" }, groundTruth: { label: "safe", risk: 5, confidence: 0.9, rationale: "Canonical brand subdomain." }, provenance, tags: ["hard-negative"] },
  { id: "url5-paypa1", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://paypa1.com/login" }, groundTruth: { label: "risky", risk: 75, confidence: 0.85, rationale: "Synthetic confusable typosquat and login path." }, provenance, tags: ["typosquat"] },
  { id: "url5-g00gle", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://g00gle.example/verify" }, groundTruth: { label: "risky", risk: 75, confidence: 0.85, rationale: "Synthetic digit substitution and verification path." }, provenance, tags: ["typosquat"] },
  { id: "url5-punycode", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://xn--paypa-4ve.example/secure" }, groundTruth: { label: "risky", risk: 80, confidence: 0.85, rationale: "Synthetic internationalized hostname with sensitive path." }, provenance, tags: ["unicode"] },
  { id: "url5-userinfo", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://paypal.com@example.net/login" }, groundTruth: { label: "risky", risk: 85, confidence: 0.9, rationale: "Misleading user-info destination." }, provenance, tags: ["obfuscation"] },
  { id: "url5-subdomain-safe", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://docs.security.example.com/guide" }, groundTruth: { label: "safe", risk: 10, confidence: 0.75, rationale: "Ordinary nested documentation domain." }, provenance, tags: ["hard-negative"] },
  { id: "url5-ip", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "http://192.0.2.8/wallet/recover" }, groundTruth: { label: "risky", risk: 85, confidence: 0.85, rationale: "Reserved IP fixture with HTTP and wallet recovery path." }, provenance, tags: ["ip"] },
];
