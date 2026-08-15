import type { AnalysisInput, Detector, DetectorContext, SignalResult } from "../core/types.js";

export class TextAuthenticityDetector implements Detector {
  readonly name = "text-authenticity-provenance-v1";
  supports(input: AnalysisInput): boolean { return input.intent === "TEXT_AUTHENTICITY_CHECK"; }
  async analyze(input: AnalysisInput, _context: DetectorContext): Promise<SignalResult> {
    if (input.intent !== "TEXT_AUTHENTICITY_CHECK") throw new Error(`${this.name} does not support ${input.intent}`);
    const metadata = input.metadata ?? {}; const evidence = []; let risk = 50; let confidence = 0.25;
    if (metadata.sourceVerified === true) { risk = 10; confidence = 0.7; evidence.push({ id: "auth-source-verified", kind: "provider" as const, title: "Verified source provenance", detail: "The caller supplied a verified source-provenance signal.", status: "available" as const, weight: .7, supportsRisk: false }); }
    else if (metadata.sourceVerified === false) { risk = 70; confidence = 0.55; evidence.push({ id: "auth-source-unverified", kind: "metadata" as const, title: "Unverified source provenance", detail: "The caller supplied an explicit unverified-source signal.", status: "available" as const, weight: .5, supportsRisk: true }); }
    if (input.claimedAuthor?.trim()) evidence.push({ id: "auth-claimed-author", kind: "metadata" as const, title: "Claimed author supplied", detail: `A claimed author was provided (${input.claimedAuthor.trim()}); this does not prove authorship.`, status: "available" as const, weight: .1, supportsRisk: false });
    return { intent: input.intent, status: "available", riskScore: risk, confidence, riskLevel: risk >= 65 ? "high" : risk >= 35 ? "medium" : "low", verdict: risk >= 65 ? "inauthentic" : risk <= 35 ? "authentic" : "uncertain", evidence, limitations: ["Text alone cannot prove who authored content", "No cryptographic signature, identity provider, or external provenance registry was consulted", "Unverified inputs remain uncertain rather than being treated as fraudulent"] };
  }
}
