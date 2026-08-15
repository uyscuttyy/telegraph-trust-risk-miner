import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createMinerServer } from "../src/miner/server.js";

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = createMinerServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing server address");
  try { await run(`http://127.0.0.1:${address.port}`); } finally { server.close(); await once(server, "close"); }
}

test("health endpoint reports readiness", () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
}));

test("analyze endpoint routes a supported request", () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/v1/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: "test-1", intent: "URL_SCAN", input: { url: "https://example.com" } }) });
  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, any>;
  assert.equal(body.requestId, "test-1");
  assert.equal(body.result.intent, "URL_SCAN");
  assert.match(body.result.limitations[0], /No external reputation/);
}));

test("analyze endpoint returns structured validation errors", () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/v1/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: "URL_SCAN", input: { url: "javascript:alert(1)" } }) });
  assert.equal(response.status, 400);
  const body = await response.json() as Record<string, unknown>;
  assert.equal(body.code, "invalid_request");
}));
