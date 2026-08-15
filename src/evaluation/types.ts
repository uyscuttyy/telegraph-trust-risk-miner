import type { AnalysisInput, SupportedIntent, TrustRiskResult } from "../core/types.js";

export type GroundTruthLabel = "safe" | "risky" | "uncertain";
export type DatasetSourceType = "real" | "synthetic" | "adversarial";

export interface EvaluationCase {
  id: string;
  intent: SupportedIntent;
  input: AnalysisInput;
  groundTruth: { label: GroundTruthLabel; risk?: number; confidence: number; rationale: string };
  provenance: { sourceType: DatasetSourceType; source: string; collectedAt: string; license?: string };
  tags: string[];
}

export interface CaseResult {
  caseId: string; intent: SupportedIntent; groundTruth: EvaluationCase["groundTruth"];
  prediction: TrustRiskResult | null; latencyMs: number; error?: string;
}

export interface ClassificationMetrics { evaluated: number; accuracy: number; precision: number; recall: number; f1: number; truePositive: number; trueNegative: number; falsePositive: number; falseNegative: number; }
export interface CalibrationMetrics { evaluated: number; brierScore: number; expectedCalibrationError: number; }
export interface RankingMetrics { evaluatedPairs: number; pairwiseAccuracy: number; }
export interface ReliabilityMetrics { total: number; completed: number; failed: number; unavailable: number; coverage: number; meanLatencyMs: number; }
export interface EvaluationReport { generatedAt: string; datasetName: string; classification: ClassificationMetrics; calibration: CalibrationMetrics; ranking: RankingMetrics; reliability: ReliabilityMetrics; structureFailures: number; cases: CaseResult[]; }
export type AnalyzeFunction = (input: AnalysisInput) => Promise<TrustRiskResult>;
