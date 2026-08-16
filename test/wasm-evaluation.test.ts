import assert from "node:assert/strict";
import test from "node:test";
import { evaluateJson, evaluateResponse } from "../src/evaluation/wasm.js";
import type { EvaluationCase } from "../src/evaluation/types.js";

const expected: EvaluationCase = { id: "case", intent: "AI_TEXT_DETECTION", input: { intent: "AI_TEXT_DETECTION", text: "A deliberately human-written fixture." }, groundTruth: { label: "safe", risk: 10, confidence: .8, rationale: "fixture" }, provenance: { sourceType: "synthetic", source: "test", collectedAt: "2026-08-14T00:00:00Z" }, tags: [] };
const response = { intent: "AI_TEXT_DETECTION", status: "available", trustScore: 90, riskScore: 10, confidence: .9, riskLevel: "minimal", verdict: "authentic", evidence: [{ id: "e", kind: "source", title: "Known source", detail: "Observed", status: "available", weight: .8, supportsRisk: false }], limitations: [], contributors: [] } as const;

test("WASM kernel is deterministic and rewards valid evidence-backed answers", () => {
  const a = evaluateResponse({ expected, response });
  assert.equal(a.valid, true); assert.equal(a.score, evaluateResponse({ expected, response }).score); assert.ok(a.score > .5);
  assert.deepEqual(JSON.parse(evaluateJson(JSON.stringify({ expected, response }))), a);
});
test("invalid or mismatched responses receive zero", () => {
  assert.equal(evaluateResponse({ expected, response: {} }).score, 0);
  assert.equal(evaluateResponse({ expected, response: { ...response, intent: "URL_SCAN" } }).score, 0);
});
test("verbosity cannot rescue a confidently wrong answer", () => {
  const evidence = Array.from({ length: 50 }, (_, i) => ({ id: `e-${i}`, kind: "source" as const, title: "Claim", detail: "Repeated unsupported text", status: "available" as const, weight: 1, supportsRisk: true }));
  const wrong = evaluateResponse({ expected, response: { ...response, trustScore: 5, riskScore: 95, confidence: 1, verdict: "unsafe", evidence } });
  const cautious = evaluateResponse({ expected, response: { ...response, trustScore: 40, riskScore: 60, confidence: .1, verdict: "suspicious", evidence: [] } });
  assert.equal(wrong.components.evidence, 0);
  assert.equal(wrong.components.confidence, 0);
  assert.ok(wrong.score < cautious.score);
});
