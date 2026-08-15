import type { AnalysisInput, Detector, DetectorContext, Evidence, SignalResult } from "../core/types.js";

interface Finding { id: string; title: string; detail: string; weight: number; kind: Evidence["kind"]; }
interface ReviewMetadata { rating?: number; accountAgeDays?: number; reviewCount?: number; verifiedPurchase?: boolean; postedAt?: string; nearbyReviewTimestamps?: string[]; duplicateTexts?: string[]; profileName?: string; claimedName?: string; profileCountry?: string; claimedCountry?: string; coordinatedAccountCount?: number; }

export class ReviewIdentityDetector implements Detector {
  readonly name = "review-identity-risk-v1";
  supports(input: AnalysisInput): boolean { return input.intent === "CONTENT_VERIFICATION" && hasReviewMetadata(input.metadata); }
  async analyze(input: AnalysisInput, _context: DetectorContext): Promise<SignalResult> {
    if (input.intent !== "CONTENT_VERIFICATION") throw new Error(`${this.name} does not support ${input.intent}`);
    const metadata = (input.metadata ?? {}) as ReviewMetadata; const findings = analyze(input.content, metadata);
    const riskScore = Math.min(100, Math.round(8 + findings.reduce((sum, item) => sum + item.weight, 0)));
    const evidenceCount = Object.values(metadata).filter(value => value !== undefined).length;
    const confidence = evidenceCount < 2 ? 0.35 : Math.min(0.88, 0.5 + Math.min(evidenceCount, 6) * 0.06);
    const verdict = riskScore >= 65 ? "inauthentic" : riskScore >= 35 ? "uncertain" : "authentic";
    return { intent: input.intent, status: "available", riskScore, confidence, riskLevel: riskScore >= 80 ? "critical" : riskScore >= 65 ? "high" : riskScore >= 35 ? "medium" : riskScore >= 15 ? "low" : "minimal", verdict, evidence: findings.map(item => ({ id: item.id, kind: item.kind, title: item.title, detail: item.detail, status: "available", weight: item.weight / 100, supportsRisk: true })), limitations: ["Risk indicators do not establish that a reviewer or identity is fraudulent", "Behavioral conclusions depend on the accuracy and completeness of supplied metadata"] };
  }
}

function analyze(content: string, data: ReviewMetadata): Finding[] {
  const findings: Finding[] = []; const normalized = normalize(content);
  const duplicate = data.duplicateTexts?.some(text => similarity(normalized, normalize(text)) >= 0.88);
  if (duplicate) findings.push(f("review-duplicate", "Near-duplicate review", "The review closely matches another supplied review.", 28, "behavioral"));
  if ((data.coordinatedAccountCount ?? 0) >= 3) findings.push(f("review-coordination", "Coordinated account pattern", `${data.coordinatedAccountCount} accounts were supplied as part of a related activity cluster.`, 24, "behavioral"));
  const burst = timestampBurst(data.postedAt, data.nearbyReviewTimestamps); if (burst >= 3) findings.push(f("review-timing", "Review timing burst", `${burst} related reviews were posted within a short time window.`, 18, "behavioral"));
  if ((data.accountAgeDays ?? Infinity) <= 7 && (data.reviewCount ?? Infinity) <= 2) findings.push(f("review-new-account", "New low-history account", "The account is new and has little review history.", 14, "metadata"));
  if (data.verifiedPurchase === false) findings.push(f("review-unverified", "Unverified purchase", "The review is not associated with a verified purchase.", 6, "metadata"));
  if ((data.rating === 1 || data.rating === 5) && /\b(amazing|perfect|best ever|terrible|worst ever|must buy|scam)\b/i.test(content)) findings.push(f("review-extreme", "Extreme rating and language", "The rating and language are both strongly polarized.", 8, "heuristic"));
  if (data.profileName && data.claimedName && normalize(data.profileName) !== normalize(data.claimedName)) findings.push(f("identity-name", "Name inconsistency", "The supplied profile and claimed names do not match.", 15, "metadata"));
  if (data.profileCountry && data.claimedCountry && normalize(data.profileCountry) !== normalize(data.claimedCountry)) findings.push(f("identity-country", "Location inconsistency", "The supplied profile and claimed countries do not match.", 10, "metadata"));
  return findings;
}
function hasReviewMetadata(metadata?: Record<string, unknown>): boolean { return !!metadata && ["rating", "accountAgeDays", "reviewCount", "verifiedPurchase", "postedAt", "nearbyReviewTimestamps", "duplicateTexts", "profileName", "claimedName", "profileCountry", "claimedCountry", "coordinatedAccountCount"].some(key => key in metadata); }
function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function similarity(a: string, b: string): number { const left = new Set(a.split(" ").filter(Boolean)); const right = new Set(b.split(" ").filter(Boolean)); if (!left.size && !right.size) return 1; const intersection = [...left].filter(item => right.has(item)).length; return intersection / new Set([...left, ...right]).size; }
function timestampBurst(postedAt?: string, nearby: string[] = []): number { if (!postedAt) return 0; const target = Date.parse(postedAt); if (Number.isNaN(target)) return 0; return nearby.filter(value => { const parsed = Date.parse(value); return !Number.isNaN(parsed) && Math.abs(parsed - target) <= 10 * 60 * 1000; }).length; }
function f(id: string, title: string, detail: string, weight: number, kind: Evidence["kind"]): Finding { return { id, title, detail, weight, kind }; }
