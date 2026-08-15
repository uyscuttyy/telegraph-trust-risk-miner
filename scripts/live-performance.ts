import fs from "node:fs";
const target = process.env.MINER_URL;
if (!target) { console.error("MINER_URL is required"); process.exitCode = 2; }
else {
  const cases = fs.readFileSync("data/benchmark/v1/cases.jsonl", "utf8").trim().split("\n").map(JSON.parse).filter((item: any) => item.split === "test");
  const observations: unknown[] = [];
  for (const item of cases) {
    const started = performance.now();
    try { const response = await fetch(`${target.replace(/\/$/, "")}/v1/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: item.intent, input: item.input }), signal: AbortSignal.timeout(15000) }); const body: any = await response.json(); observations.push({ caseId: item.id, intent: item.intent, ok: response.ok && typeof body.result?.riskScore === "number", status: response.status, latencyMs: performance.now() - started }); }
    catch (error) { observations.push({ caseId: item.id, intent: item.intent, ok: false, status: null, latencyMs: performance.now() - started, error: error instanceof Error ? error.message : "request failed" }); }
  }
  console.log(JSON.stringify({ minerUrl: target, split: "test", total: observations.length, observations }, null, 2));
}
