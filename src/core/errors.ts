export type AnalysisErrorCode = "INVALID_INPUT" | "UNSUPPORTED_INTENT" | "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT" | "RATE_LIMITED" | "INTERNAL_ERROR";

export class AnalysisError extends Error {
  constructor(public readonly code: AnalysisErrorCode, message: string, public readonly retryable: boolean, options?: ErrorOptions) {
    super(message, options); this.name = "AnalysisError";
  }
}

export function unavailableError(provider: string, cause?: unknown): AnalysisError {
  return new AnalysisError("PROVIDER_UNAVAILABLE", `${provider} is unavailable`, true, cause instanceof Error ? { cause } : undefined);
}
