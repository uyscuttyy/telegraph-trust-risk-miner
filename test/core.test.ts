import test from "node:test";
import assert from "node:assert/strict";
import { REGISTERED_INTENTS, SUPPORTED_INTENTS, validateInput, validateSignal, assertUnitInterval, assertRiskScore } from "../src/core/types.js";
import { unavailableError } from "../src/core/errors.js";

test("supports exactly the four approved intents", () => {
  assert.deepEqual(SUPPORTED_INTENTS, ["URL_SCAN", "AI_TEXT_DETECTION", "TEXT_AUTHENTICITY_CHECK", "CONTENT_VERIFICATION"]);
  assert.deepEqual(REGISTERED_INTENTS, ["AI_TEXT_DETECTION"]);
});
test("validates confidence and risk ranges", () => {
  assert.doesNotThrow(() => { assertUnitInterval(0, "confidence"); assertUnitInterval(1, "confidence"); assertRiskScore(100); });
  assert.throws(() => assertUnitInterval(1.1, "confidence"));
  assert.throws(() => assertRiskScore(-1));
});
test("rejects inconsistent unavailable signals", () => {
  assert.throws(() => validateSignal({ intent: "URL_SCAN", status: "unavailable", riskScore: null, confidence: null, riskLevel: "unknown", verdict: "unknown", evidence: [{ id: "x", kind: "provider", title: "x", detail: "x", status: "available", weight: 1, supportsRisk: true }], limitations: [] }));
});
test("validates intent-specific input", () => {
  assert.doesNotThrow(() => validateInput({ intent: "URL_SCAN", url: "https://example.com/login" }));
  assert.throws(() => validateInput({ intent: "URL_SCAN", url: "javascript:alert(1)" }));
  assert.throws(() => validateInput({ intent: "AI_TEXT_DETECTION", text: "  " }));
});
test("provider unavailable errors are explicit and retryable", () => {
  const error = unavailableError("example-provider");
  assert.equal(error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(error.retryable, true);
});
