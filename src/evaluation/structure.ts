import { SUPPORTED_INTENTS } from "../core/types.js";
import type { TrustRiskResult } from "../core/types.js";

export function validateResultStructure(value: unknown): string[] {
  const failures: string[] = [];
  if (!value || typeof value !== "object") return ["result must be an object"];
  const result = value as TrustRiskResult;
  if (!SUPPORTED_INTENTS.includes(result.intent)) failures.push("invalid intent");
  if (!["available", "unavailable", "unknown", "not_applicable"].includes(result.status)) failures.push("invalid status");
  if (result.riskScore !== null && (typeof result.riskScore !== "number" || result.riskScore < 0 || result.riskScore > 100)) failures.push("invalid riskScore");
  if (result.trustScore !== null && (typeof result.trustScore !== "number" || result.trustScore < 0 || result.trustScore > 100)) failures.push("invalid trustScore");
  if (result.confidence !== null && (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 1)) failures.push("invalid confidence");
  if (!Array.isArray(result.evidence)) failures.push("evidence must be an array");
  if (!Array.isArray(result.limitations)) failures.push("limitations must be an array");
  if (!Array.isArray(result.contributors)) failures.push("contributors must be an array");
  if (result.status === "available" && (result.trustScore === null || result.riskScore === null || result.confidence === null)) failures.push("available results require scores");
  if (typeof result.trustScore === "number" && typeof result.riskScore === "number" && result.trustScore + result.riskScore !== 100) failures.push("trustScore and riskScore must sum to 100");
  return failures;
}
