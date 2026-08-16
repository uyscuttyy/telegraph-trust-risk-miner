export const SUPPORTED_INTENTS = [
  "URL_SCAN", "AI_TEXT_DETECTION", "TEXT_AUTHENTICITY_CHECK", "CONTENT_VERIFICATION",
] as const;
export const REGISTERED_INTENTS = ["AI_TEXT_DETECTION"] as const;
export type RegisteredIntent = typeof REGISTERED_INTENTS[number];
export type SupportedIntent = typeof SUPPORTED_INTENTS[number];
export type RiskLevel = "minimal" | "low" | "medium" | "high" | "critical" | "unknown";
export type Verdict = "safe" | "likely_safe" | "suspicious" | "unsafe" | "authentic" | "inauthentic" | "uncertain" | "unknown";
export type DataStatus = "available" | "unavailable" | "unknown" | "not_applicable";
export type EvidenceKind = "provider" | "heuristic" | "metadata" | "source" | "behavioral";

export interface Evidence {
  id: string; kind: EvidenceKind; title: string; detail: string;
  source?: string; status: DataStatus; weight: number; supportsRisk: boolean;
}
export interface SignalResult {
  intent: SupportedIntent; status: DataStatus; riskScore: number | null;
  confidence: number | null; riskLevel: RiskLevel; verdict: Verdict;
  evidence: Evidence[]; limitations: string[];
}
export type AnalysisInput =
  | { intent: "URL_SCAN"; url: string; metadata?: Record<string, unknown> }
  | { intent: "AI_TEXT_DETECTION"; text: string; metadata?: Record<string, unknown> }
  | { intent: "TEXT_AUTHENTICITY_CHECK"; text: string; claimedAuthor?: string; metadata?: Record<string, unknown> }
  | { intent: "CONTENT_VERIFICATION"; content: string; sourceUrl?: string; claim?: string; metadata?: Record<string, unknown> };
export interface TrustRiskResult {
  intent: SupportedIntent; status: DataStatus; trustScore: number | null; riskScore: number | null;
  confidence: number | null; riskLevel: RiskLevel; verdict: Verdict;
  evidence: Evidence[]; limitations: string[]; contributors: ScoreContribution[]; recommendedAction?: string;
}
export interface ScoreContribution { evidenceId: string; title: string; direction: "risk" | "trust"; influence: number; }
export interface DetectorContext { now: Date; signalTimeoutMs: number; }
export interface Detector { readonly name: string; supports(input: AnalysisInput): boolean; analyze(input: AnalysisInput, context: DetectorContext): Promise<SignalResult>; }
export interface ReputationProvider { readonly name: string; lookup(indicator: string, context: DetectorContext): Promise<ProviderResult>; }
export interface TextAnalysisProvider { readonly name: string; analyzeText(text: string, context: DetectorContext): Promise<ProviderResult>; }
export interface ContentEvidenceProvider { readonly name: string; findEvidence(input: Extract<AnalysisInput, { intent: "CONTENT_VERIFICATION" }>, context: DetectorContext): Promise<ProviderResult>; }
export interface ProviderResult { status: DataStatus; value?: unknown; evidence: Evidence[]; error?: string; }
export interface TrustScoreEngine { combine(signals: SignalResult[]): TrustRiskResult; }

export function assertUnitInterval(value: number | null, field: string): void {
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1)) throw new Error(`${field} must be within [0, 1]`);
}
export function assertRiskScore(value: number | null): void {
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) throw new Error("riskScore must be within [0, 100]");
}
export function validateSignal(signal: SignalResult): void {
  if (!SUPPORTED_INTENTS.includes(signal.intent)) throw new Error(`unsupported intent: ${signal.intent}`);
  assertUnitInterval(signal.confidence, "confidence"); assertRiskScore(signal.riskScore);
  if (signal.status === "unavailable" && signal.evidence.some(e => e.status === "available")) throw new Error("unavailable signal cannot contain available evidence");
}
export function validateInput(input: AnalysisInput): void {
  const value = input.intent === "URL_SCAN" ? input.url : input.intent === "CONTENT_VERIFICATION" ? input.content : input.text;
  if (!value.trim()) throw new Error("analysis input must not be empty");
  if (input.intent === "URL_SCAN") {
    let parsed: URL;
    try { parsed = new URL(input.url); } catch { throw new Error("URL_SCAN input must be an absolute URL"); }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("URL_SCAN only accepts HTTP(S) URLs");
  }
}
