# Project Memory

- Telegraph hackathon uses only the 40 public catalog intents; the team explicitly excludes `FRAUD_DETECTION`.
- Each intent has an independent leaderboard and a Miner may subscribe to multiple intents, but quality matters more than breadth.
- Telegraph does not impose a universal schema; integration metadata must define clear intent-specific schemas.
- Baseline audit on 2026-08-16: full test suite 58/58 passed. AI_TEXT_DETECTION is strongest (F1 0.90); URL_SCAN has low malicious recall; CONTENT_VERIFICATION is semantically misaligned; TEXT_AUTHENTICITY_CHECK has no evaluation coverage.
- Render deployment verified on 2026-08-17: health endpoint and benchmark-shaped AI_TEXT_DETECTION requests returned 200. The live probe filters to registered intents only; rapid repeated requests from this environment experienced intermittent Cloudflare/Render connection resets.
- The live integration console generates top-level `input_schema` and `output_schema`; nested endpoint request/response schemas are not the current importer format.
