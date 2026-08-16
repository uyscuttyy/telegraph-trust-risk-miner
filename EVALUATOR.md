# Track 2 Evaluator Package

The evaluator accepts one JSON object on standard input and returns one deterministic JSON score on standard output.

```json
{"expected":{"id":"case","intent":"AI_TEXT_DETECTION","input":{"intent":"AI_TEXT_DETECTION","text":"A human-written fixture."},"groundTruth":{"label":"safe","risk":10,"confidence":0.8,"rationale":"fixture"},"provenance":{"sourceType":"synthetic","source":"test","collectedAt":"2026-08-14T00:00:00Z"},"tags":[]},"response":{"intent":"AI_TEXT_DETECTION","status":"available","trustScore":90,"riskScore":10,"confidence":0.9,"riskLevel":"minimal","verdict":"authentic","evidence":[],"limitations":[],"contributors":[]}}
```

Run locally:

```bash
npm run evaluator < evaluator-input.json
```

The kernel supports `AI_TEXT_DETECTION` only. It performs no network calls, reads no clock, uses no randomness, and emits no generated timestamp. Invalid structures, unsupported intents, and intent substitution score zero. Confidently incorrect answers are penalized. Evidence count is capped and cannot improve an incorrect classification.

The official Telegraph WASM ABI was not published in the currently available pre-launch material. `src/evaluation/wasm.ts` is therefore the portable scoring kernel; the final ABI wrapper must be added when Track 2 opens on 17 August 2026.
