import type { EvaluationCase } from "./types.js";
import { validateResultStructure } from "./structure.js";
import type { TrustRiskResult } from "../core/types.js";

/** Deterministic, side-effect-free scoring kernel suitable for a Telegraph WASM wrapper. */
export interface WasmEvaluationInput { expected: EvaluationCase; response: unknown; }
export interface WasmEvaluationOutput { score: number; valid: boolean; structureFailures: string[]; components: { classification: number; calibration: number; rankingSignal: number; evidence: number; confidence: number }; }

export function evaluateResponse(input: WasmEvaluationInput): WasmEvaluationOutput {
  const failures = validateResultStructure(input.response);
  if (failures.length || !input.response || typeof input.response !== "object") return invalid(failures);
  const result = input.response as TrustRiskResult;
  if (result.intent !== input.expected.intent) return invalid(["intent does not match case"]);
  const target = input.expected.groundTruth;
  const classification = target.label === "uncertain" ? 0.5 : ((target.label === "risky") === ((result.riskScore ?? 50) >= 50) ? 1 : 0);
  const calibration = target.label === "uncertain" ? 0.5 : 1 - Math.abs((result.riskScore ?? 50) / 100 - (target.label === "risky" ? 1 : 0));
  const rankingSignal = target.risk === undefined ? 0.5 : 1 - Math.min(1, Math.abs((result.riskScore ?? 50) - target.risk) / 100);
  const confidence = target.label === "uncertain" ? 1 - Math.abs((result.confidence ?? 0) - .25) : classification ? (result.confidence ?? 0) : 1 - (result.confidence ?? 0);
  const evidence = classification * Math.min(1, result.evidence.filter(item => item.status === "available" && item.detail.trim() && item.title.trim()).length / 3);
  const score = Math.round((classification * 0.4 + calibration * 0.25 + rankingSignal * 0.15 + confidence * 0.15 + evidence * 0.05) * 10000) / 10000;
  return { score, valid: true, structureFailures: [], components: { classification, calibration, rankingSignal, evidence, confidence } };
}

export function evaluateJson(input: string): string {
  const parsed = JSON.parse(input) as WasmEvaluationInput;
  return JSON.stringify(evaluateResponse(parsed));
}
function invalid(failures: string[]): WasmEvaluationOutput { return { score: 0, valid: false, structureFailures: failures, components: { classification: 0, calibration: 0, rankingSignal: 0, evidence: 0, confidence: 0 } }; }
