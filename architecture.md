# Architecture

The submitted Miner exposes `POST /v1/analyze`, accepts only the declared `AI_TEXT_DETECTION` schema, routes to the AI text detector, and combines evidence through a confidence-aware trust/risk engine. The evaluator is a deterministic AI-only scoring kernel over structured responses. Other detectors remain experimental and are not reachable through the default public server.
