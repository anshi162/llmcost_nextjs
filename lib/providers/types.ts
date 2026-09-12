// Every usage provider (OpenAI, Anthropic, and whatever's added later)
// implements this one shape. The API route and the UI only ever talk
// to this interface -- they don't know or care how any given provider's
// usage API actually works underneath.

export interface UsageTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface UsageAdapter {
  /** Display name, e.g. "OpenAI" */
  name: string;
  /** Expected prefix of a valid admin key, e.g. "sk-admin-" */
  keyPrefix: string;
  /** Name of the env var holding a server-configured key, e.g. "OPENAI_ADMIN_KEY" */
  envVar: string;
  /** Fetches raw usage totals for the last `days` days. Throws on error. */
  fetchUsage(apiKey: string, days: number): Promise<UsageTotals>;
}
