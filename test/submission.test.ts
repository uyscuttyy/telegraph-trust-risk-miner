import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseRequest, toAnalysisInput, validateAnalysisInput } from "../src/miner/protocol.js";

test("submission examples match the implemented request contract", () => {
  const requests = JSON.parse(fs.readFileSync("examples/requests.json", "utf8"));
  assert.equal(requests.length, 1);
  for (const request of requests) validateAnalysisInput(toAnalysisInput(parseRequest(request)));
  assert.deepEqual(requests.map((request: any) => request.intent), ["AI_TEXT_DETECTION"]);
});
