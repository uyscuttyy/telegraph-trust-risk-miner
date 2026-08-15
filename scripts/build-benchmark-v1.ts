import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { unzipSync, strFromU8 } from "fflate";
import type { EvaluationCase } from "../src/evaluation/types.js";
import type { VersionedEvaluationCase, DatasetManifest } from "../src/datasets/manifest.js";
import { aiTextCases } from "../src/datasets/ai-text.js";
import { phishingScamCases } from "../src/datasets/phishing-scam.js";
import { reviewIdentityCases } from "../src/datasets/review-identity.js";
import { urlRiskCases } from "../src/datasets/url-risk.js";

const version = "1.0.0";
const now = "2026-08-14T00:00:00Z";
const out = path.resolve("data/benchmark/v1");
const sha = (p: string) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const id = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
const cases: VersionedEvaluationCase[] = [];
function add(c: EvaluationCase, sourceRecordId: string) { const base = `${c.provenance.source}:${sourceRecordId}`; cases.push({ ...c, id: `v1-${id(base)}`, datasetVersion: version, sourceRecordId }); }

const sources = [
  { id: "urlhaus", name: "URLhaus recent malware URLs", url: "https://urlhaus.abuse.ch/downloads/csv_recent/", file: "/tmp/urlhaus.data", license: "URLhaus Terms of Use", notes: "Reported malicious URLs; labels reflect source reporting." },
  { id: "tranco", name: "Tranco top domains", url: "https://tranco-list.eu/top-1m.csv.zip", file: "/tmp/tranco.data", license: "Tranco License", notes: "Popularity list used only as lower-confidence benign hard negatives; popularity is not proof of safety." },
  { id: "hc3", name: "HC3", url: "https://huggingface.co/datasets/Hello-SimpleAI/HC3", file: "/tmp/hc3-first.json", license: "CC BY-NC 4.0", notes: "Human and ChatGPT answers; authorship labels follow dataset fields." },
  { id: "deceptive-opinion-spam", name: "Deceptive Opinion Spam Corpus", url: "https://myleott.com/op_spam_v1.4.zip", file: "/tmp/deceptive.data", license: "Corpus-provided license", notes: "Truthful and deceptive review corpus." },
  { id: "project-fixtures", name: "Project synthetic and adversarial fixtures", url: "repository:src/datasets", file: "src/datasets/url-risk.ts", license: "Project source license", notes: "Clearly marked synthetic/adversarial development fixtures; never represented as real-world ground truth." },
];

if (fs.existsSync("/tmp/urlhaus.data")) {
  const rows = parse(fs.readFileSync("/tmp/urlhaus.data", "utf8"), { comment: "#", relax_column_count: true, skip_empty_lines: true });
  rows.slice(0, 50).forEach((r: string[], i: number) => { const url = r.find(v => /^https?:\/\//.test(v)); if (url) add({ id: "", intent: "URL_SCAN", input: { intent: "URL_SCAN", url }, groundTruth: { label: "risky", risk: 95, confidence: .98, rationale: "Listed by URLhaus as a malware URL." }, provenance: { sourceType: "real", source: "urlhaus", collectedAt: now, license: sources[0].license }, tags: ["malware", "public-source"] }, `row-${i}`); });
}
if (fs.existsSync("/tmp/tranco.data")) {
  const z = unzipSync(fs.readFileSync("/tmp/tranco.data")); const file = Object.keys(z).find(k => k.endsWith(".csv"));
  if (file) strFromU8(z[file]).split(/\r?\n/).slice(1, 51).forEach((line, i) => { const domain = line.split(",")[1]?.trim(); if (domain) add({ id: "", intent: "URL_SCAN", input: { intent: "URL_SCAN", url: `https://${domain}` }, groundTruth: { label: "safe", risk: 20, confidence: .35, rationale: "Top Tranco domain used as a lower-confidence benign hard negative; popularity does not establish safety." }, provenance: { sourceType: "real", source: "tranco", collectedAt: now, license: sources[1].license }, tags: ["hard-negative", "popularity-proxy"] }, `rank-${i + 1}`); });
}
if (fs.existsSync("/tmp/hc3-first.json")) {
  const data = JSON.parse(fs.readFileSync("/tmp/hc3-first.json", "utf8")); const rows = data.rows ?? [];
  rows.slice(0, 50).forEach((row: any, i: number) => { const x = row.row ?? row; for (const [k, label] of [["human_answers", "safe"], ["chatgpt_answers", "risky"]] as const) { const text = Array.isArray(x[k]) ? x[k][0] : x[k]; if (typeof text === "string" && text.trim()) add({ id: "", intent: "AI_TEXT_DETECTION", input: { intent: "AI_TEXT_DETECTION", text }, groundTruth: { label, risk: label === "risky" ? 70 : 30, confidence: .8, rationale: `HC3 ${k} label.` }, provenance: { sourceType: "real", source: "hc3", collectedAt: now, license: sources[2].license }, tags: ["authorship", "public-source"] }, `${i}-${k}`); } });
}
if (fs.existsSync("/tmp/deceptive.data")) {
  const z = unzipSync(fs.readFileSync("/tmp/deceptive.data"));
  const names = Object.keys(z).filter(k => k.endsWith(".txt"));
  for (const kind of ["truthful", "deceptive"] as const) names.filter(k => k.includes(`/${kind}_`)).sort().slice(0, 50).forEach(name => add({ id: "", intent: "CONTENT_VERIFICATION", input: { intent: "CONTENT_VERIFICATION", content: strFromU8(z[name]).trim() }, groundTruth: { label: kind === "deceptive" ? "risky" : "safe", risk: kind === "deceptive" ? 85 : 15, confidence: .9, rationale: `${kind} label from the Deceptive Opinion Spam corpus.` }, provenance: { sourceType: "real", source: "deceptive-opinion-spam", collectedAt: now, license: sources[3].license }, tags: ["review", kind, "public-source"] }, name));
}
for (const c of [...aiTextCases, ...phishingScamCases, ...reviewIdentityCases, ...urlRiskCases]) add({ ...c, provenance: { ...c.provenance, source: "project-fixtures" } }, c.id);
const sorted = cases.sort((a,b) => a.id.localeCompare(b.id)); sorted.forEach((c,i) => c.split = i % 5 === 0 ? "test" : "development");
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/cases.jsonl`, sorted.map(c => JSON.stringify(c)).join("\n") + "\n");
const manifest: DatasetManifest = { name: "telegraph-trust-risk-benchmark", version, createdAt: now, sources: sources.map(s => ({ id: s.id, name: s.name, url: s.url, retrievedAt: now, sha256: sha(s.file), license: s.license, notes: s.notes })), caseCount: sorted.length, intents: [...new Set(sorted.map(c => c.intent))], splits: { development: sorted.filter(c => c.split === "development").length, test: sorted.filter(c => c.split === "test").length }, sourceTypes: { real: sorted.filter(c => c.provenance.sourceType === "real").length, synthetic: sorted.filter(c => c.provenance.sourceType === "synthetic").length, adversarial: sorted.filter(c => c.provenance.sourceType === "adversarial").length } };
fs.writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(`${out}/README.md`, `# Benchmark v${version}\n\nGenerated deterministically by scripts/build-benchmark-v1.ts. Raw downloads remain outside the repository. Tranco labels are lower-confidence proxies, not safety proof.\n`);
console.log(JSON.stringify({ cases: sorted.length, splits: manifest.splits }, null, 2));
