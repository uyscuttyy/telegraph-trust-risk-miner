import { lookup } from "node:dns/promises";
import { connect } from "node:tls";
import type { DetectorContext, ProviderResult } from "../core/types.js";
import type { RedirectProvider, TlsProvider } from "../detectors/url-risk.js";
import { isSafeExternalTarget } from "../detectors/url-risk.js";

export class SafeRedirectProvider implements RedirectProvider {
  readonly name = "safe-redirect-inspector";
  constructor(private readonly maxRedirects = 5) {}
  async inspect(start: URL, context: DetectorContext): Promise<ProviderResult> {
    let current = new URL(start); const chain: string[] = [current.href];
    for (let step = 0; step < this.maxRedirects; step++) {
      await assertPublicHost(current);
      const response = await fetch(current, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(context.signalTimeoutMs) });
      const location = response.headers.get("location");
      if (!location || response.status < 300 || response.status >= 400) return { status: "available", value: { finalUrl: current.href, chain, status: response.status }, evidence: chain.length > 1 ? [{ id: "redirect-chain", kind: "provider", title: "Redirect chain", detail: `${chain.length - 1} redirect(s), ending at ${current.hostname}.`, source: this.name, status: "available", weight: Math.min(0.2, (chain.length - 1) * 0.05), supportsRisk: chain.length > 3 }] : [] };
      current = new URL(location, current); if (!isSafeExternalTarget(current)) throw new Error("redirect targets a private or unsupported address"); chain.push(current.href);
    }
    return { status: "available", value: { finalUrl: current.href, chain }, evidence: [{ id: "redirect-limit", kind: "provider", title: "Excessive redirects", detail: `The URL reached the ${this.maxRedirects}-redirect inspection limit.`, source: this.name, status: "available", weight: 0.2, supportsRisk: true }] };
  }
}

export class NodeTlsProvider implements TlsProvider {
  readonly name = "node-tls-inspector";
  async inspect(hostname: string, context: DetectorContext): Promise<ProviderResult> {
    const addresses = await publicAddresses(hostname); const address = addresses[0];
    return new Promise((resolve, reject) => {
      const socket = connect({ host: address, port: 443, servername: hostname, rejectUnauthorized: true, timeout: context.signalTimeoutMs });
      socket.once("secureConnect", () => {
        const cert = socket.getPeerCertificate(); const protocol = socket.getProtocol(); socket.end();
        resolve({ status: "available", value: { protocol, validTo: cert.valid_to }, evidence: [{ id: "tls-valid", kind: "provider", title: "Valid TLS connection", detail: `Certificate validation succeeded using ${protocol ?? "unknown protocol"}.`, source: this.name, status: "available", weight: 0.05, supportsRisk: false }] });
      });
      socket.once("timeout", () => { socket.destroy(); reject(new Error("TLS timeout")); });
      socket.once("error", reject);
    });
  }
}

async function assertPublicHost(url: URL): Promise<void> { if (!isSafeExternalTarget(url)) throw new Error("private or unsupported URL"); await publicAddresses(url.hostname); }
async function publicAddresses(hostname: string) { const addresses = await lookup(hostname, { all: true, verbatim: true }); if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) throw new Error("hostname resolves to a private or reserved address"); return addresses.map(item => item.address); }
function isPrivateAddress(address: string): boolean { const value = address.toLowerCase(); return value === "::1" || value === "0.0.0.0" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:") || /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value); }
