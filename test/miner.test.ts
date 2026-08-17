import test from "node:test";
import assert from "node:assert/strict";
import { parseRequest, toAnalysisInput, validateAnalysisInput } from "../src/miner/protocol.js";
import { IntentRouter } from "../src/miner/router.js";
import { TextAuthenticityDetector } from "../src/detectors/text-authenticity.js";
import { readFile } from "node:fs/promises";

test("parses and converts AI_TEXT_DETECTION requests", () => { const input = toAnalysisInput(parseRequest({ intent: "AI_TEXT_DETECTION", input: { text: "example" } })); assert.deepEqual(input, { intent: "AI_TEXT_DETECTION", text: "example" }); });
test("rejects unregistered intents and undeclared fields", () => { assert.throws(() => parseRequest({ intent: "FRAUD_DETECTION", input: {} })); assert.throws(() => parseRequest({ intent: "URL_SCAN", input: { url: "https://example.com" } })); assert.throws(() => parseRequest({ intent: "AI_TEXT_DETECTION", input: { text: "example", metadata: {} } })); });
test("routes text authenticity with conservative uncertainty", async () => { const router = new IntentRouter([new TextAuthenticityDetector()]); const result = await router.route({ intent: "TEXT_AUTHENTICITY_CHECK", text: "sample" }); assert.equal(result.status, "available"); assert.equal(result.intent, "TEXT_AUTHENTICITY_CHECK"); assert.equal(result.verdict, "uncertain"); assert.match(result.limitations[0], /cannot prove/); });
test("miner YAML declares only approved intents and an HTTPS deployment placeholder", async () => {
  const yaml = await readFile(new URL("../miner.yaml", import.meta.url), "utf8");
  assert.match(yaml, /base_url: https:\/\//);
  assert.match(yaml, /    - AI_TEXT_DETECTION/);
  for (const intent of ["URL_SCAN", "TEXT_AUTHENTICITY_CHECK", "CONTENT_VERIFICATION", "FRAUD_DETECTION", "PHISHING_DETECTION"]) assert.doesNotMatch(yaml, new RegExp(`    - ${intent}`));
  assert.match(yaml, /^input_schema:/m); assert.match(yaml, /^output_schema:/m);
});
