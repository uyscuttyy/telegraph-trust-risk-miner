import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("submission gate artifacts exist", () => { for (const file of ["scripts/submission-gate.ts", "SUBMISSION.md", "EVALUATOR.md", "evaluator.yaml", "Dockerfile", ".dockerignore"]) assert.equal(fs.existsSync(file), true, file); });
