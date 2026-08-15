import test from "node:test";
import assert from "node:assert/strict";
import { parseRequest, toAnalysisInput, validateAnalysisInput } from "../src/miner/protocol.js";
import { IntentRouter } from "../src/miner/router.js";
import { TextAuthenticityDetector } from "../src/detectors/text-authenticity.js";
import { readFile } from "node:fs/promises";

test("parses and converts URL_SCAN requests", () => { const input = toAnalysisInput(parseRequest({ intent: "URL_SCAN", input: { url: "https://example.com" } })); assert.deepEqual(input, { intent: "URL_SCAN", url: "https://example.com", metadata: undefined }); });
test("rejects unsupported intent and invalid URL", () => { assert.throws(() => parseRequest({ intent: "FRAUD_DETECTION", input: {} })); assert.throws(() => validateAnalysisInput(toAnalysisInput(parseRequest({ intent: "URL_SCAN", input: { url: "javascript:x" } })))); });
test("routes text authenticity with conservative uncertainty", async () => { const router = new IntentRouter([new TextAuthenticityDetector()]); const result = await router.route({ intent: "TEXT_AUTHENTICITY_CHECK", text: "sample" }); assert.equal(result.status, "available"); assert.equal(result.intent, "TEXT_AUTHENTICITY_CHECK"); assert.equal(result.verdict, "uncertain"); assert.match(result.limitations[0], /cannot prove/); });
test("miner YAML declares only approved intents and an HTTPS deployment placeholder", async () => {
  const yaml = await readFile(new URL("../miner.yaml", import.meta.url), "utf8");
  assert.match(yaml, /base_url: https:\/\//);
  for (const intent of ["URL_SCAN", "AI_TEXT_DETECTION", "TEXT_AUTHENTICITY_CHECK", "CONTENT_VERIFICATION"]) assert.match(yaml, new RegExp(`- ${intent}`));
  assert.doesNotMatch(yaml, /FRAUD_DETECTION|PHISHING_DETECTION/);
});
