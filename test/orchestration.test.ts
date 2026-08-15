import test from "node:test";
import assert from "node:assert/strict";
import type { AnalysisInput, Detector, DetectorContext, Evidence, SignalResult } from "../src/core/types.js";
import { IntentRouter } from "../src/miner/router.js";

const input: AnalysisInput = { intent: "URL_SCAN", url: "https://example.com" };
function result(riskScore: number, evidence: Evidence[] = []): SignalResult { return { intent: "URL_SCAN", status: "available", riskScore, confidence: 0.8, riskLevel: riskScore >= 60 ? "high" : "low", verdict: riskScore >= 60 ? "unsafe" : "likely_safe", evidence, limitations: [] }; }
function detector(name: string, analyze: (input: AnalysisInput, context: DetectorContext) => Promise<SignalResult>, supports = true): Detector { return { name, supports: () => supports, analyze }; }

test("independent detectors execute concurrently", async () => {
  const intervals: Array<[number, number]> = [];
  const delayed = (name: string) => detector(name, async () => { const start = performance.now(); await new Promise(resolve => setTimeout(resolve, 80)); intervals.push([start, performance.now()]); return result(20); });
  await new IntentRouter([delayed("a"), delayed("b")], 500).route(input);
  assert.equal(intervals.length, 2);
  assert.ok(intervals[0][0] < intervals[1][1] && intervals[1][0] < intervals[0][1], "detector intervals did not overlap");
});
test("a failed detector does not discard successful intelligence", async () => { const router = new IntentRouter([detector("good", async () => result(80)), detector("broken", async () => { throw new Error("provider offline"); })]); const output = await router.route(input); assert.equal(output.status, "available"); assert.equal(output.riskScore, 80); assert.ok(output.limitations.some(item => item.includes("broken: provider offline"))); assert.ok((output.confidence ?? 1) < 0.8); });
test("a detector timeout becomes unavailable without discarding a fast result", async () => { const hanging = detector("slow", async () => new Promise<SignalResult>(() => {})); const output = await new IntentRouter([detector("fast", async () => result(70)), hanging], 30).route(input); assert.equal(output.riskScore, 70); assert.ok(output.limitations.some(item => item.includes("slow: timed out"))); });
test("irrelevant detectors are not executed", async () => { let called = false; const irrelevant = detector("irrelevant", async () => { called = true; return result(10); }, false); await new IntentRouter([detector("relevant", async () => result(10)), irrelevant]).route(input); assert.equal(called, false); });
test("duplicate evidence is emitted once and keeps strongest weight", async () => { const weak: Evidence = { id: "same", kind: "heuristic", title: "Duplicate", detail: "weak", status: "available", weight: 0.2, supportsRisk: true }; const strong: Evidence = { ...weak, detail: "strong", weight: 0.8 }; const output = await new IntentRouter([detector("weak", async () => result(40, [weak])), detector("strong", async () => result(60, [strong]))]).route(input); assert.equal(output.evidence.filter(item => item.id === "same").length, 1); assert.equal(output.evidence.find(item => item.id === "same")?.detail, "strong"); });
test("identical inputs produce stable scores and contributors", async () => { const evidence: Evidence = { id: "stable", kind: "provider", title: "Stable", detail: "fixture", source: "test", status: "available", weight: 0.7, supportsRisk: true }; const router = new IntentRouter([detector("stable", async () => result(65, [evidence]))]); const first = await router.route(input); const second = await router.route(input); assert.deepEqual({ trustScore: first.trustScore, riskScore: first.riskScore, confidence: first.confidence, contributors: first.contributors }, { trustScore: second.trustScore, riskScore: second.riskScore, confidence: second.confidence, contributors: second.contributors }); });
