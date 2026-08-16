# Telegraph Hackathon Final Refinement Audit

Audit date: 2026-08-16. The official hackathon catalog and the Telegraph team's clarification are the source of truth. `FRAUD_DETECTION` is excluded from this hackathon even though it appears in the public catalog.

## Executive summary

**Current verdict: NOT READY.** The Miner runs and the full test suite passes (58/58), but the registration metadata advertises four intents while only one is a credible competitive candidate. The public deployment URL is still a placeholder, the evaluator is a portable TypeScript kernel rather than the final Telegraph WASM adapter, and the benchmark has a semantic mismatch for `CONTENT_VERIFICATION`.

Measured committed test-split baseline:

| Intent | Cases | Accuracy | F1 | Brier | Pairwise ranking | Mean latency |
|---|---:|---:|---:|---:|---:|---:|
| URL_SCAN | 20 | 0.70 | 0.25 | 0.1247 | 0.8417 | 9.25 ms |
| AI_TEXT_DETECTION | 21 | 0.90 | 0.90 | 0.1702 | 0.9197 | 2.23 ms |
| CONTENT_VERIFICATION | 26 | 0.48 | 0.2353 | 0.4737 | 0.5548 | 2.31 ms |
| TEXT_AUTHENTICITY_CHECK | 0 | n/a | n/a | n/a | n/a | n/a |

## Official 40-intent coverage matrix

The public page lists the following 40 identifiers. Public descriptions are short catalog use cases; exact request/response schemas are not published there, so no undocumented schema is inferred.

| Official intent | Implemented today | Tested | Evaluated | Quality | Competitive decision |
|---|---|---|---|---|---|
| STOCK_PRICE | No | No | No | Unsupported | Do not register |
| CRYPTO_PRICE | No | No | No | Unsupported | Do not register |
| FINANCIAL_DATA | No | No | No | Unsupported | Do not register |
| CURRENCY_EXCHANGE | No | No | No | Unsupported | Do not register |
| WALLET_BALANCE_CHECK | No | No | No | Unsupported | Do not register |
| GAS_PRICE | No | No | No | Unsupported | Do not register |
| TOKEN_HOLDER_COUNT | No | No | No | Unsupported | Do not register |
| TVL_LOOKUP | No | No | No | Unsupported | Do not register |
| ONCHAIN_TX_LOOKUP | No | No | No | Unsupported | Do not register |
| WEATHER_CHECK | No | No | No | Unsupported | Do not register |
| STORM_ALERT | No | No | No | Unsupported | Do not register |
| WEATHER_FORECAST | No | No | No | Unsupported | Do not register |
| SPORTS_SCORE | No | No | No | Unsupported | Do not register |
| GAME_RESULT | No | No | No | Unsupported | Do not register |
| SSL_VERIFICATION | No | No | No | Unsupported | Do not register |
| CVE_LOOKUP | No | No | No | Unsupported | Do not register |
| IP_GEOLOCATION | No | No | No | Unsupported | Do not register |
| URL_SCAN | Yes | Yes | Yes | Medium | Tier B; improve before registering |
| WEB_SEARCH | No | No | No | Unsupported | Do not register |
| NEWS_HEADLINES | No | No | No | Unsupported | Do not register |
| NEWS_SEARCH | No | No | No | Unsupported | Do not register |
| RESEARCH_SYNTHESIS | No | No | No | Unsupported | Do not register |
| RESEARCH_QUERY | No | No | No | Unsupported | Do not register |
| ACADEMIC_SEARCH | No | No | No | Unsupported | Do not register |
| FACT_CHECK | No | No | No | Unsupported | Do not register |
| TWITTER_SEARCH | No | No | No | Unsupported | Do not register |
| LANGUAGE_GENERATION | No | No | No | Unsupported | Do not register |
| CHAT_COMPLETION | No | No | No | Unsupported | Do not register |
| TEXT_GENERATION | No | No | No | Unsupported | Do not register |
| TASK_COMPLETION | No | No | No | Unsupported | Do not register |
| AGENT_TASK | No | No | No | Unsupported | Do not register |
| SENTIMENT_ANALYSIS | No | No | No | Unsupported | Do not register |
| TEXT_CLASSIFICATION | No | No | No | Unsupported | Do not register |
| CONTENT_MODERATION | No | No | No | Unsupported | Do not register |
| CONTENT_VERIFICATION | Yes | Yes | Yes | Weak | Remove; implementation is review-risk detection, not plagiarism checking |
| AI_TEXT_DETECTION | Yes | Yes | Yes | Medium/strong | Tier A candidate |
| TEXT_AUTHENTICITY_CHECK | Yes | No | No | Weak | Remove; trusts caller metadata and has no ground truth |
| CONTENT_EXTRACTION | No | No | No | Unsupported | Do not register |
| LANGUAGE_TRANSLATION | No | No | No | Unsupported | Do not register |
| FRAUD_DETECTION | No | No | No | Excluded by team | Never register or evaluate |

## Capability and competitiveness scores

Scores use correctness, reliability, evidence quality, evaluation quality, robustness, latency, and output quality.

| Intent | Score | Tier | Reason |
|---|---:|---|---|
| AI_TEXT_DETECTION | 68/100 | A candidate | Strongest measured F1 and ranking, fast deterministic execution; calibration and corpus diversity need work. |
| URL_SCAN | 51/100 | B | Good local parsing and evidence, but URLhaus recall is 0.1429 because no deterministic reputation source is active. |
| TEXT_AUTHENTICITY_CHECK | 18/100 | C | Caller-controlled `sourceVerified`, no independent authenticity signal, no benchmark. |
| CONTENT_VERIFICATION | 12/100 | C | Current behavior detects scam/review risk; official use case is plagiarism checking. |

## Critical gaps

1. `miner.yaml`, `evaluator.yaml`, README, and the submission gate advertise weak/misaligned intents.
2. YAML has no intent-specific request/response schema despite the protocol being schema-agnostic.
3. URL provider evidence is appended but does not affect the URL risk score; default providers are absent.
4. The benchmark's `CONTENT_VERIFICATION` data is deceptive-review data, not plagiarism ground truth.
5. Benchmark splitting is record-hash based rather than source/topic/group aware, leaving leakage risk.
6. The dataset builder depends on hard-coded `/tmp` files and hashes missing files, so clean reproduction is fragile.
7. The evaluator's evidence component measures evidence quantity/shape, not factual correctness; it is only a portable kernel until the official WASM ABI is available.
8. `submission:gate` is flaky when the server suite is run in isolation and hardcodes the obsolete four-intent set.
9. The public URL is a placeholder, so registration cannot pass.

## Security and performance

The default Miner performs no outbound URL requests, limiting active SSRF exposure. Optional redirect fetching validates private addresses before access, but DNS rebinding remains a possible gap. Request size is capped at 128 KiB, metadata is not runtime-schema validated, and there is no rate limiting/authentication. Full tests pass in 61.3 seconds; detector execution is concurrent and local latency is low, but P50/P95 must be recorded after scope fixes.

## Recommended order

1. Reduce declared/registered intents to `AI_TEXT_DETECTION`; keep `URL_SCAN` opt-in until recall is improved and measured.
2. Add explicit per-intent schemas to metadata and align validation/examples/tests.
3. Improve evaluator reproducibility and metrics (including latency percentiles and macro classification metrics).
4. Repair benchmark provenance/splitting and remove semantically invalid content-verification claims.
5. Harden metadata validation, body limits, and optional network-provider handling.
6. Add required project-state documentation and run the submission gate against a real deployment URL.
7. Re-run all tests/evaluations, then commit and push.

