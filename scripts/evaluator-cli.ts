import { evaluateJson } from "../src/evaluation/wasm.js";

let input = "";
for await (const chunk of process.stdin) input += chunk;
try { process.stdout.write(evaluateJson(input) + "\n"); }
catch (error) { process.stderr.write(JSON.stringify({ error: error instanceof Error ? error.message : "invalid evaluator input" }) + "\n"); process.exitCode = 1; }
