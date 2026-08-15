# Miner Registration Readiness

The repository contains the generic Miner metadata in `miner.yaml` and serves `POST /v1/analyze` plus `GET /healthz`.

Before registration:

1. Deploy the server at a stable public HTTPS URL.
2. Replace `base_url` in `miner.yaml` with that URL.
3. Run `npm run registration:check`.
4. Verify `GET /healthz` and every supported intent through the public endpoint.
5. Submit the metadata through Telegraph's current integration platform using the official account and registration flow.

The repository does not contain registration credentials or an official CLI/API token. No external registration is performed automatically.

Current implementation status:

- `URL_SCAN`: implemented.
- `AI_TEXT_DETECTION`: implemented.
- `CONTENT_VERIFICATION`: implemented for review/content signals.
- `TEXT_AUTHENTICITY_CHECK`: conservative provenance-based detector; returns uncertainty when verification signals are absent.
