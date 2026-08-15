import fs from "node:fs";
import path from "node:path";

const failures: string[] = [];
const yaml = read("miner.yaml");
const evaluator = read("evaluator.yaml");
if (/replace-with-deployed|localhost|127\.0\.0\.1/.test(yaml)) failures.push("miner.yaml base_url is not a public deployment URL");
for (const intent of ["URL_SCAN", "AI_TEXT_DETECTION", "TEXT_AUTHENTICITY_CHECK", "CONTENT_VERIFICATION"]) if (!yaml.includes(`- ${intent}`) || !evaluator.includes(`- ${intent}`)) failures.push(`intent declaration missing: ${intent}`);
if (/FRAUD_DETECTION|PHISHING_DETECTION/.test(yaml)) failures.push("unsupported intent declared in miner metadata");
for (const file of ["SUBMISSION.md", "EVALUATOR.md", "REGISTRATION.md", "Dockerfile", ".dockerignore", "examples/requests.json", "data/benchmark/v1/manifest.json"]) if (!fs.existsSync(file)) failures.push(`required submission artifact missing: ${file}`);
for (const file of walk(".")) {
  if (file.includes("node_modules") || file.includes(".git") || file.startsWith("./data/benchmark/v1/cases")) continue;
  const content = read(file);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}/.test(content)) failures.push(`possible secret material: ${file}`);
}
if (failures.length) { console.error(JSON.stringify({ ready: false, failures }, null, 2)); process.exitCode = 1; }
else console.log(JSON.stringify({ ready: true, checks: ["metadata", "intents", "artifacts", "secret scan"] }, null, 2));
function read(file: string): string { return fs.readFileSync(file, "utf8"); }
function walk(directory: string): string[] { const entries = fs.readdirSync(directory, { withFileTypes: true }); return entries.flatMap(entry => { if (entry.isDirectory() && ["node_modules", ".git", ".agents", ".codex"].includes(entry.name)) return []; const target = path.join(directory, entry.name); return entry.isDirectory() ? walk(target) : [target]; }); }
