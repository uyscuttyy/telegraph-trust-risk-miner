# Telegraph Trust Risk Miner

`telegraph-trust-risk-miner` is a TypeScript Miner for the Telegraph Hackathon. The submission profile focuses on evidence-based AI text detection with separate risk and confidence values, limitations, and explicit uncertainty.

## Supported Intents

- `AI_TEXT_DETECTION`

URL and other trust/risk detectors remain experimental repository components and are not advertised or registered because their current benchmark quality is not competitive enough.

## Current Status

The repository contains:

- A generic Telegraph-style HTTP Miner
- A registered AI-text detector plus experimental trust/risk detectors
- A versioned benchmark dataset with source provenance and hashes
- A deterministic evaluator kernel and stdin/stdout evaluator adapter
- Docker deployment packaging
- Miner and evaluator metadata
- A local submission gate
- Public progress and submission documentation

The Miner is deployed at `https://telegraph-trust-risk-miner.onrender.com`. The final Telegraph WASM wrapper must still be aligned with the official Track 2 ABI when released.

## Quick Start

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run typecheck
npm test
```

Start the local Miner:

```bash
npm start
```

Then check readiness:

```bash
curl http://localhost:8080/healthz
```

## Example Request

```bash
curl -X POST http://localhost:8080/v1/analyze \
  -H 'content-type: application/json' \
  -d '{"intent":"AI_TEXT_DETECTION","input":{"text":"In conclusion, it is important to note that this sample uses highly regular explanatory prose."}}'
```

All supported request examples are in [examples/requests.json](examples/requests.json). The complete API contract is in [SUBMISSION.md](SUBMISSION.md).

## Benchmark

Build the versioned benchmark from the declared public sources:

```bash
npm run dataset:build
node --test --import tsx test/dataset-manifest.test.ts
```

The generated manifest records source URLs, retrieval metadata, licenses, hashes, case counts, and development/test splits. Tranco popularity is treated as a lower-confidence benign proxy, not proof of safety.

## Evaluator

The deterministic evaluator accepts one JSON object on stdin and returns one JSON result:

```bash
npm run evaluator < evaluator-input.json
```

See [EVALUATOR.md](EVALUATOR.md) and [evaluator.yaml](evaluator.yaml).

## Docker

```bash
docker build -t telegraph-trust-risk-miner .
docker run --rm -p 8080:8080 -e PORT=8080 telegraph-trust-risk-miner
```

The container runs as a non-root user and exposes port `8080`.

## Submission Checks

Before replacing the deployment URL:

```bash
npm run registration:check
```

After deploying to a stable public HTTPS endpoint and updating `miner.yaml`:

```bash
npm run submission:gate
MINER_URL=https://your-public-miner.example npm run live:probe
```

The gate intentionally fails while the public URL remains a placeholder.

## Limitations

- Heuristic detectors can produce false positives and false negatives.
- AI-text detection cannot prove authorship or AI origin.
- The submitted detector is local and deterministic; it does not use an external classifier.
- Experimental URL, provenance, and content-risk components are not part of the registration profile.
- No live Telegraph ranking or latency claims are made before deployment.

## Project Documents

- [Miner submission package](SUBMISSION.md)
- [Evaluator package](EVALUATOR.md)
- [Registration checklist](REGISTRATION.md)
- [Public progress materials](PUBLIC_PROGRESS.md)
- [Benchmark manifest](data/benchmark/v1/manifest.json)

## License

No repository license has been selected yet. Add the intended license before publishing the GitHub repository.
