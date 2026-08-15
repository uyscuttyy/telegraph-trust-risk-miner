import fs from "node:fs";
import { SUPPORTED_INTENTS } from "../src/core/types.js";

const yaml = fs.readFileSync("miner.yaml", "utf8");
const required = ["version: \"1\"", "kind: miner", "protocol: generic", "path: /v1/analyze", "method: POST", "auth:\n  type: none"];
const failures = required.filter(fragment => !yaml.includes(fragment));
for (const intent of SUPPORTED_INTENTS) if (!yaml.includes(`    - ${intent}`)) failures.push(`missing intent ${intent}`);
if (/replace-with-deployed|localhost|127\.0\.0\.1/.test(yaml)) failures.push("base_url is not a deployable public URL");
if (/FRAUD_DETECTION|PHISHING_DETECTION/.test(yaml)) failures.push("unsupported intent present");
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; } else console.log("registration metadata is structurally ready");
