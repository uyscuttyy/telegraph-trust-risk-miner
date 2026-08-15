import test from "node:test";
import assert from "node:assert/strict";
import { inspectUrl, isSafeExternalTarget, UrlRiskDetector } from "../src/detectors/url-risk.js";
import { SafeRedirectProvider } from "../src/providers/url-network.js";
import { IntentRouter } from "../src/miner/router.js";
import { PhishingScamDetector } from "../src/detectors/phishing-scam.js";
import { urlRiskCases } from "../src/datasets/url-risk.js";
import { runEvaluation } from "../src/evaluation/runner.js";

test("normalizes URL and exposes Unicode/domain components", () => { const info = inspectUrl("https://xn--paypa-4ve.example/verify"); assert.equal(info.hostname, "xn--paypa-4ve.example"); assert.ok(info.unicodeHostname); assert.equal(info.tld, "example"); });
test("rejects private and unsupported external targets", () => { assert.equal(isSafeExternalTarget(new URL("http://127.0.0.1")), false); assert.equal(isSafeExternalTarget(new URL("ftp://example.com")), false); assert.equal(isSafeExternalTarget(new URL("https://example.com")), true); });
test("detects typosquatting independently from phishing rules", async () => { const result = await new IntentRouter([new UrlRiskDetector()]).route({ intent: "URL_SCAN", url: "https://paypa1.com/login" }); assert.ok(result.evidence.some(item => item.id === "url-typosquat")); assert.ok((result.riskScore ?? 0) >= 35); });
test("provider failures degrade with explicit limitations", async () => { const detector = new UrlRiskDetector({ reputationProviders: [{ name: "failing", lookup: async () => { throw new Error("offline"); } }] }); const result = await detector.analyze({ intent: "URL_SCAN", url: "https://example.com" }, { now: new Date(), signalTimeoutMs: 50 }); assert.ok(result.limitations.some(item => item.includes("failing"))); assert.equal(result.status, "available"); });
test("redirect provider blocks private targets before network access", async () => { const provider = new SafeRedirectProvider(); await assert.rejects(() => provider.inspect(new URL("http://127.0.0.1"), { now: new Date(), signalTimeoutMs: 50 }), /private|reserved/i); });
test("combined synthetic URL benchmark measures the two independent detectors", async () => { const router = new IntentRouter([new PhishingScamDetector(), new UrlRiskDetector()]); const report = await runEvaluation("phase-5-synthetic-url-risk", urlRiskCases, input => router.route(input)); assert.equal(report.reliability.failed, 0); assert.ok(report.classification.f1 >= 0.8); assert.ok(report.classification.accuracy >= 0.8); });
