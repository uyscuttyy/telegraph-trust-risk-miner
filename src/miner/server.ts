import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AiTextDetector } from "../detectors/ai-text.js";
import { IntentRouter } from "./router.js";
import { parseRequest, toAnalysisInput, validateAnalysisInput } from "./protocol.js";

const defaultRouter = new IntentRouter([new AiTextDetector()]);
export function createMinerServer(router = defaultRouter) {
  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/healthz") return send(res, 200, { status: "ok" });
    if (req.method !== "POST" || req.url !== "/v1/analyze") return send(res, 404, { error: "not found", code: "not_found" });
    try { const request = parseRequest(await readJson(req)); const input = toAnalysisInput(request); validateAnalysisInput(input); const result = await router.route(input); return send(res, 200, { requestId: request.requestId ?? crypto.randomUUID(), intent: request.intent, result }); }
    catch (error) { console.warn(JSON.stringify({ event: "miner_request_failed", message: error instanceof Error ? error.message : "invalid request" })); return send(res, 400, { error: error instanceof Error ? error.message : "invalid request", code: "invalid_request" }); }
  });
  server.requestTimeout = 20_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}
async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 131072) throw new Error("request body too large");
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new Error("invalid JSON"); }
}
function send(res: ServerResponse, status: number, body: unknown) { res.statusCode = status; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(body)); }
if (process.argv[1]?.endsWith("server.ts")) {
  const server = createMinerServer(); const port = Number(process.env.PORT ?? 8080);
  server.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "miner_started", port })));
  const shutdown = (signal: string) => { console.log(JSON.stringify({ event: "miner_shutdown", signal })); server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 5_000).unref(); };
  process.once("SIGTERM", () => shutdown("SIGTERM")); process.once("SIGINT", () => shutdown("SIGINT"));
}
