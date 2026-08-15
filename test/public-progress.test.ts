import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("public progress material includes required disclosures", () => {
  const text = fs.readFileSync("PUBLIC_PROGRESS.md", "utf8");
  for (const disclosure of ["not publicly deployed", "No Telegraph leaderboard", "not proof of safety", "official Telegraph WASM ABI"]) assert.match(text, new RegExp(disclosure, "i"));
  assert.doesNotMatch(text, /\b(?:9[0-9]|100)% accuracy\b/i);
});
