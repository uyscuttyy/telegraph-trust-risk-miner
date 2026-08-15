import test from "node:test";
import assert from "node:assert/strict";
import { ReviewIdentityDetector } from "../src/detectors/review-identity.js";
import { reviewIdentityCases } from "../src/datasets/review-identity.js";
import { IntentRouter } from "../src/miner/router.js";
import { runEvaluation } from "../src/evaluation/runner.js";

const router = new IntentRouter([new ReviewIdentityDetector()]);
test("detects duplicate and coordinated review evidence", async () => { const result = await router.route(reviewIdentityCases[1].input); assert.ok((result.riskScore ?? 0) >= 65); assert.ok(result.evidence.some(item => item.id === "review-duplicate")); assert.ok(result.evidence.some(item => item.id === "review-coordination")); assert.match(result.limitations[0], /do not establish/); });
test("does not label negative sentiment alone as fake", async () => { const result = await router.route(reviewIdentityCases[3].input); assert.ok((result.riskScore ?? 100) < 35); });
test("identity mismatch remains an uncertain risk signal", async () => { const result = await router.route(reviewIdentityCases[5].input); assert.ok((result.riskScore ?? 0) >= 35); assert.equal(result.verdict, "uncertain"); });
test("synthetic review benchmark reports measured performance", async () => { const report = await runEvaluation("phase-8-synthetic-review-identity", reviewIdentityCases, input => router.route(input)); assert.equal(report.reliability.failed, 0); assert.ok(report.classification.accuracy >= 0.8); assert.ok(report.classification.f1 >= 0.8); });
