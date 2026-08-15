import test from "node:test";
import assert from "node:assert/strict";
import { validateDataset } from "../src/evaluation/dataset.js";
import { calibrationMetrics, classificationMetrics, rankingMetrics } from "../src/evaluation/metrics.js";
import { runEvaluation } from "../src/evaluation/runner.js";
import { reportToMarkdown } from "../src/evaluation/report.js";
import { validateResultStructure } from "../src/evaluation/structure.js";
import type { CaseResult, EvaluationCase } from "../src/evaluation/types.js";
import type { TrustRiskResult } from "../src/core/types.js";

const cases: EvaluationCase[] = [
  { id: "safe-url", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://example.com" }, groundTruth: { label: "safe", risk: 5, confidence: 1, rationale: "Reserved example domain." }, provenance: { sourceType: "synthetic", source: "RFC example fixture", collectedAt: "2026-08-14T00:00:00Z" }, tags: ["fixture"] },
  { id: "risky-url", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: "https://malicious.example/login" }, groundTruth: { label: "risky", risk: 95, confidence: 0.8, rationale: "Synthetic risky fixture, not real threat intelligence." }, provenance: { sourceType: "synthetic", source: "test fixture", collectedAt: "2026-08-14T00:00:00Z" }, tags: ["fixture"] },
];

function prediction(riskScore: number, confidence = 0.9): TrustRiskResult { return { intent: "URL_SCAN", status: "available", trustScore: 100 - riskScore, riskScore, confidence, riskLevel: riskScore >= 60 ? "high" : "low", verdict: riskScore >= 60 ? "unsafe" : "likely_safe", evidence: [], limitations: [], contributors: [] }; }

test("dataset validation requires unique ids and provenance", () => { assert.doesNotThrow(() => validateDataset(cases)); assert.throws(() => validateDataset([cases[0], cases[0]])); });
test("classification, calibration, and ranking reward correct separation", () => { const rows: CaseResult[] = [{ caseId: "safe", intent: "URL_SCAN", groundTruth: cases[0].groundTruth, prediction: prediction(10), latencyMs: 1 }, { caseId: "risky", intent: "URL_SCAN", groundTruth: cases[1].groundTruth, prediction: prediction(90), latencyMs: 1 }]; assert.equal(classificationMetrics(rows).f1, 1); assert.ok(calibrationMetrics(rows).brierScore < 0.02); assert.equal(rankingMetrics(rows).pairwiseAccuracy, 1); });
test("uncertain ground truth is excluded from hard classification", () => { const rows: CaseResult[] = [{ caseId: "u", intent: "URL_SCAN", groundTruth: { label: "uncertain", confidence: 0.4, rationale: "unknown" }, prediction: prediction(90), latencyMs: 1 }]; assert.equal(classificationMetrics(rows).evaluated, 0); });
test("structured output validator catches contradictory available output", () => { const invalid = { ...prediction(10), riskScore: null }; assert.match(validateResultStructure(invalid).join(" "), /require scores/); });
test("runner records metrics and generates a report without claiming real ground truth", async () => { const report = await runEvaluation("synthetic-smoke", cases, async input => prediction(input.intent === "URL_SCAN" && input.url.includes("malicious") ? 90 : 10)); assert.equal(report.classification.accuracy, 1); assert.equal(report.reliability.coverage, 1); assert.match(reportToMarkdown(report), /synthetic-smoke/); });
test("runner records analyzer failures", async () => { const report = await runEvaluation("failure-smoke", [cases[0]], async () => { throw new Error("provider failed"); }); assert.equal(report.reliability.failed, 1); assert.equal(report.cases[0].prediction, null); });
