import type { AnalysisInput, Detector, DetectorContext, Evidence, SignalResult } from "../core/types.js";

interface Finding { id: string; title: string; detail: string; weight: number; supportsRisk: boolean; }

export class AiTextDetector implements Detector {
  readonly name = "ai-text-heuristics-v1";
  supports(input: AnalysisInput): boolean { return input.intent === "AI_TEXT_DETECTION"; }
  async analyze(input: AnalysisInput, _context: DetectorContext): Promise<SignalResult> {
    if (input.intent !== "AI_TEXT_DETECTION") throw new Error(`${this.name} does not support ${input.intent}`);
    const text = input.text.trim(); const words = tokenize(text); const findings = analyzeText(text, words);
    const short = words.length < 25; const score = clamp(40 + findings.reduce((sum, item) => sum + item.weight, 0), 0, 100);
    const confidence = short ? 0.3 : Math.min(0.86, 0.48 + Math.min(findings.length, 5) * 0.07);
    const verdict = score >= 65 ? "inauthentic" : score <= 35 ? "authentic" : "uncertain";
    const riskLevel = score >= 80 ? "critical" : score >= 65 ? "high" : score >= 35 ? "medium" : score >= 15 ? "low" : "minimal";
    const limitations = ["AI-origin detection is probabilistic and cannot establish authorship", "No external classifier or document provenance was consulted"];
    if (short) limitations.push("Short text has insufficient stylistic evidence");
    return { intent: input.intent, status: "available", riskScore: score, confidence, riskLevel, verdict, evidence: findings.map(item => ({ id: item.id, kind: "heuristic", title: item.title, detail: item.detail, status: "available", weight: Math.abs(item.weight) / 100, supportsRisk: item.supportsRisk })), limitations };
  }
}

function analyzeText(text: string, words: string[]): Finding[] {
  const lower = text.toLowerCase(); const findings: Finding[] = [];
  if (/(in conclusion|it is important to note|furthermore|moreover|additionally|overall,)/g.test(lower)) findings.push({ id: "ai-transitions", title: "Template-like transitions", detail: "Multiple stock transitions associated with formulaic explanatory prose were found.", weight: 13, supportsRisk: true });
  if (/^\s*(1\.|2\.|3\.|- )/m.test(text) && /\n/.test(text)) findings.push({ id: "ai-structured-list", title: "Formulaic structure", detail: "The sample uses a highly regular list structure.", weight: 8, supportsRisk: true });
  const sentences = text.split(/[.!?]+/).map(item => item.trim()).filter(Boolean); const lengths = sentences.map(item => tokenize(item).length);
  if (lengths.length >= 4 && coefficientOfVariation(lengths) < 0.35) findings.push({ id: "ai-uniform-sentences", title: "Uniform sentence lengths", detail: "Sentence lengths have unusually low variation.", weight: 12, supportsRisk: true });
  const diversity = words.length ? new Set(words).size / words.length : 0;
  if (words.length >= 50 && diversity < 0.48) findings.push({ id: "ai-low-diversity", title: "Low lexical diversity", detail: "The sample repeats a narrow vocabulary across a longer passage.", weight: 9, supportsRisk: true });
  if (/(this article|this response|as an ai|i cannot|please note that|in today's world)/.test(lower)) findings.push({ id: "ai-meta-language", title: "Generic assistant phrasing", detail: "The sample contains generic assistant or article-template phrasing.", weight: 14, supportsRisk: true });
  if (/(can't|won't|I'm|I've|we're|it's)/.test(text)) findings.push({ id: "human-contractions", title: "Conversational contraction", detail: "Contractions provide a weak human-style signal.", weight: -6, supportsRisk: false });
  if (/[!?]{2,}|\.\.\./.test(text)) findings.push({ id: "human-irregular-punctuation", title: "Irregular punctuation", detail: "Informal punctuation provides a weak human-style signal.", weight: -5, supportsRisk: false });
  return findings;
}
function tokenize(text: string): string[] { return text.toLowerCase().match(/[a-z0-9']+/g) ?? []; }
function coefficientOfVariation(values: number[]): number { const mean = values.reduce((a, b) => a + b, 0) / values.length; if (!mean) return 0; const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length; return Math.sqrt(variance) / mean; }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Math.round(value))); }
