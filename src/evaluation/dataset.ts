import { SUPPORTED_INTENTS, validateInput } from "../core/types.js";
import type { EvaluationCase } from "./types.js";

export function validateDataset(cases: readonly EvaluationCase[]): void {
  const ids = new Set<string>();
  for (const item of cases) {
    if (!item.id.trim() || ids.has(item.id)) throw new Error(`dataset case id must be unique: ${item.id}`);
    ids.add(item.id);
    if (!SUPPORTED_INTENTS.includes(item.intent) || item.input.intent !== item.intent) throw new Error(`${item.id}: intent mismatch`);
    validateInput(item.input);
    if (!Number.isFinite(item.groundTruth.confidence) || item.groundTruth.confidence < 0 || item.groundTruth.confidence > 1) throw new Error(`${item.id}: invalid ground-truth confidence`);
    if (item.groundTruth.risk !== undefined && (!Number.isFinite(item.groundTruth.risk) || item.groundTruth.risk < 0 || item.groundTruth.risk > 100)) throw new Error(`${item.id}: invalid ground-truth risk`);
    if (!item.groundTruth.rationale.trim()) throw new Error(`${item.id}: rationale is required`);
    if (!item.provenance.source.trim() || !item.provenance.collectedAt.trim()) throw new Error(`${item.id}: provenance is required`);
    if (Number.isNaN(Date.parse(item.provenance.collectedAt))) throw new Error(`${item.id}: invalid provenance date`);
  }
}
