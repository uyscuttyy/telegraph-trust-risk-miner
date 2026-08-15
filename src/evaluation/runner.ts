import type { AnalyzeFunction, CaseResult, EvaluationCase, EvaluationReport } from "./types.js";
import { validateDataset } from "./dataset.js";
import { calibrationMetrics, classificationMetrics, rankingMetrics, reliabilityMetrics } from "./metrics.js";
import { validateResultStructure } from "./structure.js";

export async function runEvaluation(datasetName: string, cases: readonly EvaluationCase[], analyze: AnalyzeFunction): Promise<EvaluationReport> {
  validateDataset(cases); const results: CaseResult[] = []; let structureFailures = 0;
  for (const item of cases) { const started = performance.now(); try { const prediction = await analyze(item.input); const failures = validateResultStructure(prediction); structureFailures += failures.length ? 1 : 0; results.push({ caseId: item.id, intent: item.intent, groundTruth: item.groundTruth, prediction, latencyMs: performance.now() - started, error: failures.length ? failures.join("; ") : undefined }); } catch (error) { results.push({ caseId: item.id, intent: item.intent, groundTruth: item.groundTruth, prediction: null, latencyMs: performance.now() - started, error: error instanceof Error ? error.message : "unknown evaluation error" }); } }
  return { generatedAt: new Date().toISOString(), datasetName, classification: classificationMetrics(results), calibration: calibrationMetrics(results), ranking: rankingMetrics(results), reliability: reliabilityMetrics(results), structureFailures, cases: results };
}
