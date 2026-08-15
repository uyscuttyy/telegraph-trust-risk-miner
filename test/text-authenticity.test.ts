import test from "node:test";
import assert from "node:assert/strict";
import { TextAuthenticityDetector } from "../src/detectors/text-authenticity.js";

test("verified provenance lowers risk without claiming authorship proof", async () => { const result = await new TextAuthenticityDetector().analyze({ intent: "TEXT_AUTHENTICITY_CHECK", text: "text", metadata: { sourceVerified: true } }, { now: new Date(), signalTimeoutMs: 1000 }); assert.equal(result.riskScore, 10); assert.equal(result.verdict, "authentic"); assert.match(result.limitations[0], /cannot prove/); });
test("unverified provenance raises risk conservatively", async () => { const result = await new TextAuthenticityDetector().analyze({ intent: "TEXT_AUTHENTICITY_CHECK", text: "text", metadata: { sourceVerified: false } }, { now: new Date(), signalTimeoutMs: 1000 }); assert.equal(result.riskScore, 70); assert.equal(result.confidence, .55); });
