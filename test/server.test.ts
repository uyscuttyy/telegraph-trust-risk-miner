import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createMinerServer } from "../src/miner/server.js";

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = createMinerServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing server address");
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); server.closeAllConnections(); await closed; }
}

test("health endpoint reports readiness", () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
}));

test("analyze endpoint routes a supported request", () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/v1/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: "test-1", intent: "AI_TEXT_DETECTION", input: { text: "This short sample is intentionally ambiguous." } }) });
  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, any>;
  assert.equal(body.requestId, "test-1");
  assert.equal(body.result.intent, "AI_TEXT_DETECTION");
  assert.match(body.result.limitations[0], /probabilistic/);
}));

test("analyze endpoint returns structured validation errors", () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/v1/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: "URL_SCAN", input: { url: "https://example.com" } }) });
  assert.equal(response.status, 400);
  const body = await response.json() as Record<string, unknown>;
  assert.equal(body.code, "invalid_request");
}));
test("request body limit is enforced while streaming", () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/v1/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: "AI_TEXT_DETECTION", input: { text: "x".repeat(132000) } }) });
  assert.equal(response.status, 400); const body = await response.json() as Record<string, unknown>;
  assert.equal(body.code, "invalid_request"); assert.equal(body.error, "request body too large");
}));
