import type { Evidence, RiskLevel, ScoreContribution, SignalResult, TrustRiskResult, TrustScoreEngine, Verdict } from "../core/types.js";

const RELIABILITY: Record<Evidence["kind"], number> = { provider: 0.95, source: 0.9, metadata: 0.8, behavioral: 0.75, heuristic: 0.65 };

export class EvidenceTrustScoreEngine implements TrustScoreEngine {
  combine(signals: SignalResult[]): TrustRiskResult {
    if (!signals.length) throw new Error("at least one signal is required");
    const intent = signals[0].intent;
    if (signals.some(signal => signal.intent !== intent)) throw new Error("cannot combine signals from different intents");
    const usable = signals.filter(signal => signal.status === "available" && signal.riskScore !== null && signal.confidence !== null);
    const evidence = signals.flatMap(signal => signal.evidence); const limitations = [...new Set(signals.flatMap(signal => signal.limitations))];
    if (!usable.length) return { intent, status: "unavailable", trustScore: null, riskScore: null, confidence: null, riskLevel: "unknown", verdict: "unknown", evidence, limitations, contributors: contributions(evidence) };

    const weighted = usable.map(signal => ({ signal, effectiveConfidence: effectiveConfidence(signal) }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.effectiveConfidence, 0);
    const averageRisk = totalWeight ? weighted.reduce((sum, item) => sum + (item.signal.riskScore ?? 0) * item.effectiveConfidence, 0) / totalWeight : 0;
    const strongest = weighted.reduce((best, item) => (item.signal.riskScore ?? 0) * item.effectiveConfidence > (best.signal.riskScore ?? 0) * best.effectiveConfidence ? item : best);
    const strongestRisk = strongest.signal.riskScore ?? 0;
    const preserveSevere = strongestRisk >= 60 && strongest.effectiveConfidence >= 0.55;
    const riskScore = round(preserveSevere ? strongestRisk * 0.65 + averageRisk * 0.35 : averageRisk);
    const spread = Math.max(...usable.map(item => item.riskScore ?? 0)) - Math.min(...usable.map(item => item.riskScore ?? 0));
    const contradictionFactor = spread > 30 ? Math.max(0.55, 1 - spread / 180) : 1;
    const coverage = usable.length / signals.filter(signal => signal.status !== "not_applicable").length;
    const confidence = roundUnit((weighted.reduce((sum, item) => sum + item.effectiveConfidence, 0) / usable.length) * coverage * contradictionFactor);
    const trustScore = 100 - riskScore;
    const domainVerdict = usable.length === 1 ? usable[0].verdict : verdict(riskScore);
    return { intent, status: "available", trustScore, riskScore, confidence, riskLevel: level(riskScore), verdict: domainVerdict, evidence, limitations: spread > 30 ? [...limitations, "Detector disagreement reduced final confidence"] : limitations, contributors: contributions(evidence), recommendedAction: action(riskScore, confidence) };
  }
}

function effectiveConfidence(signal: SignalResult): number { const totalEvidenceWeight = signal.evidence.reduce((sum, item) => sum + Math.min(1, Math.abs(item.weight)), 0); const strength = totalEvidenceWeight ? signal.evidence.reduce((sum, item) => sum + RELIABILITY[item.kind] * Math.min(1, Math.abs(item.weight)), 0) / totalEvidenceWeight : 0.5; return (signal.confidence ?? 0) * (0.7 + 0.3 * strength); }
function contributions(evidence: Evidence[]): ScoreContribution[] { return evidence.map(item => ({ evidenceId: item.id, title: item.title, direction: item.supportsRisk ? "risk" as const : "trust" as const, influence: roundUnit(Math.min(1, Math.abs(item.weight)) * RELIABILITY[item.kind]) })).sort((a, b) => b.influence - a.influence).slice(0, 5); }
function level(score: number): RiskLevel { return score >= 80 ? "critical" : score >= 60 ? "high" : score >= 35 ? "medium" : score >= 15 ? "low" : "minimal"; }
function verdict(score: number): Verdict { return score >= 60 ? "unsafe" : score >= 35 ? "suspicious" : "likely_safe"; }
function action(score: number, confidence: number): string { if (confidence < 0.45) return "obtain_more_evidence"; if (score >= 60) return "do_not_proceed"; if (score >= 35) return "review_evidence"; return "proceed_with_caution"; }
function round(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }
function roundUnit(value: number): number { return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100; }
