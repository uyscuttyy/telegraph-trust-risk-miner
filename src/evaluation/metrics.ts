import type { CalibrationMetrics, CaseResult, ClassificationMetrics, RankingMetrics, ReliabilityMetrics } from "./types.js";

const probability = (item: CaseResult) => (item.prediction?.riskScore ?? 0) / 100;
const labeled = (items: readonly CaseResult[]) => items.filter(i => i.groundTruth.label !== "uncertain" && i.prediction?.riskScore !== null && i.prediction !== null);

export function classificationMetrics(items: readonly CaseResult[], threshold = 50): ClassificationMetrics {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (const item of labeled(items)) { const actual = item.groundTruth.label === "risky"; const predicted = (item.prediction?.riskScore ?? 0) >= threshold; if (actual && predicted) tp++; else if (!actual && !predicted) tn++; else if (!actual) fp++; else fn++; }
  const evaluated = tp + tn + fp + fn; const precision = ratio(tp, tp + fp); const recall = ratio(tp, tp + fn);
  return { evaluated, accuracy: ratio(tp + tn, evaluated), precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0, truePositive: tp, trueNegative: tn, falsePositive: fp, falseNegative: fn };
}

export function calibrationMetrics(items: readonly CaseResult[], bins = 10): CalibrationMetrics {
  const rows = labeled(items); if (!rows.length) return { evaluated: 0, brierScore: 0, expectedCalibrationError: 0, confidenceBrierScore: 0 };
  const brierScore = rows.reduce((sum, item) => sum + (probability(item) - (item.groundTruth.label === "risky" ? 1 : 0)) ** 2, 0) / rows.length;
  const confidenceBrierScore = rows.reduce((sum, item) => { const correct = ((item.prediction?.riskScore ?? 0) >= 50) === (item.groundTruth.label === "risky") ? 1 : 0; return sum + ((item.prediction?.confidence ?? 0) - correct) ** 2; }, 0) / rows.length;
  let ece = 0;
  for (let bin = 0; bin < bins; bin++) { const low = bin / bins, high = (bin + 1) / bins; const members = rows.filter(i => probability(i) >= low && (bin === bins - 1 ? probability(i) <= high : probability(i) < high)); if (!members.length) continue; const avgPrediction = members.reduce((s, i) => s + probability(i), 0) / members.length; const avgActual = members.filter(i => i.groundTruth.label === "risky").length / members.length; ece += members.length / rows.length * Math.abs(avgPrediction - avgActual); }
  return { evaluated: rows.length, brierScore, expectedCalibrationError: ece, confidenceBrierScore };
}

export function rankingMetrics(items: readonly CaseResult[]): RankingMetrics {
  const rows = items.filter(i => i.groundTruth.risk !== undefined && i.prediction?.riskScore !== null && i.prediction !== null); let pairs = 0, correct = 0;
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) { const truth = (rows[i].groundTruth.risk ?? 0) - (rows[j].groundTruth.risk ?? 0); if (truth === 0) continue; pairs++; const predicted = (rows[i].prediction?.riskScore ?? 0) - (rows[j].prediction?.riskScore ?? 0); if (Math.sign(predicted) === Math.sign(truth)) correct++; else if (predicted === 0) correct += 0.5; }
  return { evaluatedPairs: pairs, pairwiseAccuracy: ratio(correct, pairs) };
}

export function reliabilityMetrics(items: readonly CaseResult[]): ReliabilityMetrics {
  const completed = items.filter(i => i.prediction).length; const failed = items.filter(i => i.error).length; const unavailable = items.filter(i => i.prediction?.status === "unavailable").length;
  const latencies = items.map(item => item.latencyMs).sort((a, b) => a - b);
  return { total: items.length, completed, failed, unavailable, coverage: ratio(completed - unavailable, items.length), meanLatencyMs: ratio(latencies.reduce((sum, value) => sum + value, 0), latencies.length), p50LatencyMs: percentile(latencies, .5), p95LatencyMs: percentile(latencies, .95) };
}
function percentile(sorted: readonly number[], quantile: number): number { if (!sorted.length) return 0; return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)]; }
function ratio(numerator: number, denominator: number): number { return denominator ? numerator / denominator : 0; }
