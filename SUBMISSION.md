# Telegraph Trust Risk Intelligence Miner

## Track

Track 1: Miner. The project also contains a separate Track 2 evaluator package under `src/evaluation`.

## Endpoint

- Health: `GET /healthz`
- Analysis: `POST /v1/analyze`
- Content type: `application/json`
- Maximum request body: 128 KiB
- Authentication: none at the Miner HTTP layer

The public HTTPS base URL must replace the placeholder in `miner.yaml` before submission.

## Registered Intent

| Intent | Input | Implementation | Important limitation |
|---|---|---|---|
| `AI_TEXT_DETECTION` | `text` | Probabilistic stylistic heuristics with explicit evidence and uncertainty | Cannot establish authorship or prove AI origin |

## Request Contract

```json
{
  "requestId": "optional-client-id",
  "intent": "AI_TEXT_DETECTION",
  "input": {
    "text": "Text to assess"
  }
}
```

See `examples/requests.json` for one valid request per intent.

## Response Contract

```json
{
  "requestId": "optional-client-id",
  "intent": "AI_TEXT_DETECTION",
  "result": {
    "status": "available",
    "trustScore": 90,
    "riskScore": 10,
    "confidence": 0.7,
    "riskLevel": "minimal",
    "verdict": "safe",
    "evidence": [],
    "limitations": [],
    "contributors": [],
    "recommendedAction": "proceed"
  }
}
```

Risk and confidence are separate. Missing intelligence is represented as `unavailable`, `unknown`, or `not_applicable`; it is never silently treated as safe.

## Deployment

```bash
docker build -t telegraph-trust-risk .
docker run --rm -p 8080:8080 -e PORT=8080 telegraph-trust-risk
curl --fail http://localhost:8080/healthz
```

Deploy the same image behind a stable HTTPS endpoint, update `base_url` in `miner.yaml`, and run:

```bash
npm run registration:check
MINER_URL=https://your-public-miner.example npm run live:probe
```

## Reproducible Verification

```bash
npm ci
npm run typecheck
npm test
npm run dataset:build
node --test --import tsx test/dataset-manifest.test.ts
```

## Providers and Data

The core detectors operate without required paid APIs. The URL engine defines replaceable provider boundaries for network or reputation enrichment. Public evaluation data includes URLhaus, Tranco, HC3, and clearly marked project fixtures. Source hashes and licenses are recorded in `data/benchmark/v1/manifest.json`.

## Security and Privacy

- No credentials or wallet secrets are committed.
- Request bodies are size limited.
- Invalid inputs return structured errors.
- External provider failures degrade to explicit unavailable states.
- Submitted text and URLs should be treated as potentially hostile data.

## Known Limitations

- Heuristic outputs are probabilistic and may produce false positives or false negatives.
- The Miner does not prove fraud, identity, or authorship.
- The submitted AI detector is a deterministic heuristic model and can miss edited or atypical AI text.
- Live ranking and latency claims require a public deployment and Telegraph traffic.
