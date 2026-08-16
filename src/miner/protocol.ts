import type { AnalysisInput, SupportedIntent, TrustRiskResult } from "../core/types.js";
import { REGISTERED_INTENTS, validateInput } from "../core/types.js";

export interface MinerRequest { intent: SupportedIntent; input: Record<string, unknown>; requestId?: string; }
export interface MinerResponse { requestId: string; intent: SupportedIntent; result: TrustRiskResult; }

export function parseRequest(body: unknown): MinerRequest {
  if (!body || typeof body !== "object") throw new Error("request body must be an object");
  const raw = body as Record<string, unknown>;
  if (typeof raw.intent !== "string" || !REGISTERED_INTENTS.includes(raw.intent as typeof REGISTERED_INTENTS[number])) throw new Error("unsupported or missing intent");
  if (!raw.input || typeof raw.input !== "object" || Array.isArray(raw.input)) throw new Error("input must be an object");
  if (Object.keys(raw).some(key => !["requestId", "intent", "input"].includes(key))) throw new Error("request contains unsupported fields");
  const input = raw.input as Record<string, unknown>;
  if (Object.keys(input).some(key => key !== "text")) throw new Error("input contains unsupported fields");
  return { intent: raw.intent as SupportedIntent, input: raw.input as Record<string, unknown>, requestId: typeof raw.requestId === "string" ? raw.requestId : undefined };
}

export function toAnalysisInput(request: MinerRequest): AnalysisInput {
  const input = request.input;
  switch (request.intent) {
    case "URL_SCAN": return { intent: request.intent, url: requiredString(input.url, "url"), metadata: input.metadata as Record<string, unknown> | undefined };
    case "AI_TEXT_DETECTION": return { intent: request.intent, text: requiredString(input.text, "text") };
    case "TEXT_AUTHENTICITY_CHECK": return { intent: request.intent, text: requiredString(input.text, "text"), claimedAuthor: optionalString(input.claimedAuthor), metadata: input.metadata as Record<string, unknown> | undefined };
    case "CONTENT_VERIFICATION": return { intent: request.intent, content: requiredString(input.content, "content"), claim: optionalString(input.claim), sourceUrl: optionalString(input.sourceUrl), metadata: input.metadata as Record<string, unknown> | undefined };
  }
}

function requiredString(value: unknown, name: string): string { if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string`); return value; }
function optionalString(value: unknown): string | undefined { return typeof value === "string" ? value : undefined; }
export function validateAnalysisInput(input: AnalysisInput): void { validateInput(input); }
