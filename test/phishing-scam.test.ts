import test from "node:test";
import assert from "node:assert/strict";
import { PhishingScamDetector } from "../src/detectors/phishing-scam.js";
import { phishingScamCases } from "../src/datasets/phishing-scam.js";
import { runEvaluation } from "../src/evaluation/runner.js";
import { IntentRouter } from "../src/miner/router.js";

const detector = new PhishingScamDetector();
const router = new IntentRouter([detector]);

test("detects a synthetic impersonation URL with evidence", async () => { const result = await router.route({ intent: "URL_SCAN", url: "http://paypal-account.example.top/login" }); assert.ok((result.riskScore ?? 0) >= 60); assert.ok(result.evidence.some(item => item.id === "url-brand-mismatch")); });
test("does not flag a canonical brand subdomain as impersonation", async () => { const result = await router.route({ intent: "URL_SCAN", url: "https://accounts.google.com/signin" }); assert.ok((result.riskScore ?? 100) < 35); assert.ok(!result.evidence.some(item => item.id === "url-brand-mismatch")); });
test("distinguishes credential theft from security education", async () => { const risky = await router.route({ intent: "CONTENT_VERIFICATION", content: "Urgent support request: send your OTP immediately or your account will be locked. Message me privately." }); const training = await router.route({ intent: "CONTENT_VERIFICATION", content: "Security awareness training: never share your OTP or password. Report phishing." }); assert.ok((risky.riskScore ?? 0) >= 60); assert.ok((training.riskScore ?? 100) < 35); });
test("synthetic Phase 4 benchmark reports measured performance", async () => { const report = await runEvaluation("phase-4-synthetic-phishing-scam", phishingScamCases, input => router.route(input)); assert.equal(report.reliability.failed, 0); assert.ok(report.classification.f1 >= 0.8); assert.ok(report.classification.accuracy >= 0.8); });
