import type { EvaluationCase } from "../evaluation/types.js";
import type { SupportedIntent } from "../core/types.js";

export type DatasetSplit = "development" | "test";
export interface DatasetSourceManifest { id: string; name: string; url: string; retrievedAt: string; sha256: string; license: string; notes: string; }
export interface DatasetManifest { name: string; version: string; createdAt: string; sources: DatasetSourceManifest[]; caseCount: number; intents: SupportedIntent[]; splits: Record<DatasetSplit, number>; sourceTypes: Record<"real" | "synthetic" | "adversarial", number>; }
export interface VersionedEvaluationCase extends EvaluationCase { datasetVersion: string; split: DatasetSplit; sourceRecordId: string; }

export function validateVersionedDataset(manifest: DatasetManifest, cases: readonly VersionedEvaluationCase[]): void {
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("dataset version must use semantic versioning");
  if (manifest.caseCount !== cases.length) throw new Error("manifest case count mismatch");
  const sourceIds = new Set(manifest.sources.map(source => source.id));
  if (manifest.sources.some(source => !/^[a-f0-9]{64}$/.test(source.sha256) || !source.license.trim())) throw new Error("sources require SHA-256 and license metadata");
  for (const item of cases) { if (item.datasetVersion !== manifest.version) throw new Error(`${item.id}: dataset version mismatch`); if (!sourceIds.has(item.provenance.source)) throw new Error(`${item.id}: unknown provenance source`); if (!item.sourceRecordId.trim()) throw new Error(`${item.id}: source record id is required`); }
  const development = cases.filter(item => item.split === "development").length; const test = cases.length - development;
  if (manifest.splits.development !== development || manifest.splits.test !== test) throw new Error("manifest split counts mismatch");
}
