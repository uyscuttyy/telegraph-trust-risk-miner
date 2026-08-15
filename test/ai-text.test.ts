import test from "node:test";
import assert from "node:assert/strict";
import { AiTextDetector } from "../src/detectors/ai-text.js";
import { aiTextCases } from "../src/datasets/ai-text.js";
import { runEvaluation } from "../src/evaluation/runner.js";
import { IntentRouter } from "../src/miner/router.js";

const router = new IntentRouter([new AiTextDetector()]);
test("marks short text uncertain with low confidence", async () => { const result = await router.route({ intent: "AI_TEXT_DETECTION", text: "Looks good to me." }); assert.equal(result.verdict, "uncertain"); assert.ok((result.confidence ?? 1) <= 0.3); assert.ok(result.limitations.some(item => item.includes("Short text"))); });
test("returns interpretable AI-style evidence", async () => { const result = await router.route({ intent: "AI_TEXT_DETECTION", text: "It is important to note that planning supports progress. Furthermore, communication supports progress. Moreover, measurement supports progress. Additionally, review supports progress. In conclusion, each practice supports progress." }); assert.ok(result.evidence.some(item => item.id === "ai-transitions")); assert.ok((result.riskScore ?? 0) >= 50); });
test("recognizes weak human-style signals without claiming certainty", async () => { const result = await router.route({ intent: "AI_TEXT_DETECTION", text: "I wasn't sure it'd work, but we tried it anyway... The first run failed, then Maya spotted my typo! It's fixed now, and we're watching it." }); assert.ok((result.riskScore ?? 100) < 50); assert.ok(result.evidence.some(item => item.supportsRisk === false)); });
test("synthetic AI-text benchmark reports measured performance", async () => { const report = await runEvaluation("phase-7-synthetic-ai-text", aiTextCases, input => router.route(input)); assert.equal(report.reliability.failed, 0); assert.ok(report.classification.accuracy >= 0.8); assert.ok(report.classification.f1 >= 0.8); assert.equal(report.classification.evaluated, 6); });
