import type { AnalysisInput, Detector, DetectorContext, Evidence, SignalResult, TrustRiskResult } from "../core/types.js";
import { validateSignal } from "../core/types.js";
import { EvidenceTrustScoreEngine } from "../scoring/trust-score.js";

export class IntentRouter {
  constructor(private readonly detectors: readonly Detector[], private readonly timeoutMs = 5000, private readonly scoreEngine = new EvidenceTrustScoreEngine()) {}
  async route(input: AnalysisInput): Promise<TrustRiskResult> {
    const selected = this.detectors.filter(detector => detector.supports(input));
    if (!selected.length) return { intent: input.intent, status: "unavailable", trustScore: null, riskScore: null, confidence: null, riskLevel: "unknown", verdict: "unknown", evidence: [], limitations: ["No detector is registered for this intent"], contributors: [] };
    const context: DetectorContext = { now: new Date(), signalTimeoutMs: this.timeoutMs };
    const results = await Promise.all(selected.map(detector => executeDetector(detector, input, context)));
    return this.scoreEngine.combine(deduplicateEvidence(results));
  }
}

async function executeDetector(detector: Detector, input: AnalysisInput, context: DetectorContext): Promise<SignalResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timed out")), context.signalTimeoutMs); });
    const result = await Promise.race([detector.analyze(input, context), timeout]);
    validateSignal(result);
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown detector failure";
    return { intent: input.intent, status: "unavailable", riskScore: null, confidence: null, riskLevel: "unknown", verdict: "unknown", evidence: [], limitations: [`${detector.name}: ${reason}`] };
  } finally { if (timer) clearTimeout(timer); }
}

function deduplicateEvidence(signals: SignalResult[]): SignalResult[] {
  const best = new Map<string, Evidence>();
  for (const signal of signals) for (const item of signal.evidence) { const key = `${item.source ?? "local"}:${item.id}`; const current = best.get(key); if (!current || Math.abs(item.weight) > Math.abs(current.weight)) best.set(key, item); }
  const emitted = new Set<string>();
  return signals.map(signal => ({ ...signal, evidence: signal.evidence.filter(item => { const key = `${item.source ?? "local"}:${item.id}`; if (emitted.has(key) || best.get(key) !== item) return false; emitted.add(key); return true; }) }));
}
