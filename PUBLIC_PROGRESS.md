# Public Progress Materials

These drafts describe the repository as it exists today. Update deployment and ranking sections only after obtaining measured results.

## Short Project Description

Telegraph Trust Risk Intelligence is a multi-signal Miner for `URL_SCAN`, `AI_TEXT_DETECTION`, `TEXT_AUTHENTICITY_CHECK`, and `CONTENT_VERIFICATION`. It returns separate risk and confidence values, structured evidence, limitations, and explicit unavailable states rather than treating missing intelligence as safe.

## Architecture Summary

```text
Telegraph request
  -> input validation
  -> intent router
  -> relevant detector only
  -> evidence aggregation
  -> confidence-aware trust scoring
  -> structured Miner response
```

Current detectors:

- URL structure and hostname-risk analysis
- Phishing and scam language signals
- Probabilistic AI-text signals
- Review and identity-consistency indicators
- Conservative source-provenance assessment

External providers are optional and replaceable. Provider failures must return explicit unavailable states.

## Benchmark Methodology

The versioned benchmark contains development and held-out test splits with source provenance, retrieval dates, licenses, and SHA-256 hashes. Sources include URLhaus, Tranco, HC3, and clearly labeled project fixtures.

Important qualifications:

- URLhaus labels reflect source reports.
- Tranco popularity is only a lower-confidence benign proxy, not proof of safety.
- HC3 labels describe its dataset records and are not universal forensic proof.
- Synthetic fixtures remain marked as synthetic.
- No benchmark result should be published until the exact command, dataset version, and output artifact are preserved.

## Honest Limitations

- Heuristic analysis can produce false positives and false negatives.
- AI-text detection cannot prove authorship or AI origin.
- Text authenticity cannot prove identity without verifiable provenance.
- Content-risk indicators do not establish fraud or factual falsity.
- URL enrichment is limited when external reputation and registration providers are unavailable.
- The Miner is not publicly deployed yet.
- No Telegraph leaderboard or live latency result exists yet.
- The evaluator kernel is deterministic, but the official Telegraph WASM ABI wrapper is pending the Track 2 specification.

## X Draft 1: Build Progress

Building Telegraph Trust Risk Intelligence for the @TelegraphProtocol hackathon.

Current Miner coverage:
- URL_SCAN
- AI_TEXT_DETECTION
- TEXT_AUTHENTICITY_CHECK
- CONTENT_VERIFICATION

The focus is evidence-driven risk scoring, separate confidence, explicit unavailable states, and reproducible evaluation. Public deployment and live ranking are next; no leaderboard claims yet.

## X Draft 2: Evaluation

The evaluation layer for Telegraph Trust Risk Intelligence now has a versioned dataset manifest, provenance and source hashes, development/test splits, deterministic scoring, confidence penalties, and anti-verbosity checks.

The final Telegraph WASM ABI wrapper remains pending the official Track 2 specification. Results will be published only from reproducible runs.

## X Draft 3: Deployment

Deployment preparation is complete for Telegraph Trust Risk Intelligence: container definition, non-root runtime, health endpoint, request limits, timeouts, graceful shutdown, submission metadata, and a fail-closed preflight gate.

The gate intentionally blocks submission until a real public HTTPS endpoint replaces the placeholder URL.

## Discord Progress Update

Project: Telegraph Trust Risk Intelligence

Implemented four supported intents: URL_SCAN, AI_TEXT_DETECTION, TEXT_AUTHENTICITY_CHECK, and CONTENT_VERIFICATION. Responses distinguish risk from confidence and include evidence, limitations, and explicit unavailable states.

The repository now includes deployment packaging, versioned benchmark data, deterministic evaluator logic, anti-gaming tests, Miner/evaluator metadata, and a submission gate. Remaining external blockers are public HTTPS deployment and the official Track 2 WASM ABI/submission interface. I am not claiming live ranking or benchmark performance until those runs exist.

## Release Update Template

Use this only after a real run:

```text
Version:
Commit/reference:
Public endpoint:
Dataset version:
Intent:
Cases evaluated:
Accuracy/F1/calibration:
P50/P95 latency:
Failures/unavailable responses:
Telegraph rank:
Known weaknesses:
Reproduction command:
```

## Publication Checklist

- Confirm every number comes from a saved result artifact.
- Do not call Tranco domains verified safe.
- Do not describe synthetic fixtures as real incidents.
- Do not imply authorship or fraud was proven.
- Do not claim a WASM artifact exists until it compiles against the official ABI.
- Do not publish endpoint URLs before health and intent smoke tests pass.
- Remove wallet addresses, tokens, email addresses, and private infrastructure details.
