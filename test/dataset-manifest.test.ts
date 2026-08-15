import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { validateVersionedDataset, type DatasetManifest, type VersionedEvaluationCase } from "../src/datasets/manifest.js";

test("versioned benchmark has valid provenance, unique records, and separated splits", () => {
  const manifest = JSON.parse(fs.readFileSync("data/benchmark/v1/manifest.json", "utf8")) as DatasetManifest;
  const cases = fs.readFileSync("data/benchmark/v1/cases.jsonl", "utf8").trim().split("\n").map(line => JSON.parse(line)) as VersionedEvaluationCase[];
  validateVersionedDataset(manifest, cases);
  assert.equal(new Set(cases.map(item => item.id)).size, cases.length);
  assert.equal(new Set(cases.map(item => `${item.provenance.source}:${item.sourceRecordId}`)).size, cases.length);
  assert.ok(manifest.sourceTypes.real > 0);
  assert.ok(manifest.sourceTypes.synthetic > 0);
  assert.ok(manifest.splits.development > 0 && manifest.splits.test > 0);
  for (const source of manifest.sources) assert.match(source.sha256, /^[a-f0-9]{64}$/);
});
