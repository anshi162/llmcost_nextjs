// Pricing in $ per 1M tokens, as of September 2026. Illustrative --
// verify against provider pricing pages before using these numbers for
// real decisions. LLM pricing changes often; update this periodically.
export type Tier = "premium" | "mid" | "cheap";

export interface ModelPricing {
  name: string;
  provider: string;
  input: number;
  output: number;
  tier: Tier;
}

export const MODELS: ModelPricing[] = [
  // OpenAI
  { name: "GPT-5.6 Sol", provider: "OpenAI", input: 5.0, output: 30.0, tier: "premium" },
  { name: "GPT-5.6 Terra", provider: "OpenAI", input: 2.0, output: 12.0, tier: "mid" },
  { name: "GPT-5.6 Luna", provider: "OpenAI", input: 0.2, output: 1.2, tier: "cheap" },
  // Anthropic
  { name: "Claude Opus 5", provider: "Anthropic", input: 5.0, output: 25.0, tier: "premium" },
  { name: "Claude Sonnet 5", provider: "Anthropic", input: 3.0, output: 15.0, tier: "mid" },
  { name: "Claude Haiku 4.5", provider: "Anthropic", input: 1.0, output: 5.0, tier: "cheap" },
  // Google
  { name: "Gemini 3.1 Pro", provider: "Google", input: 2.0, output: 12.0, tier: "mid" },
  { name: "Gemini 3.5 Flash", provider: "Google", input: 1.5, output: 9.0, tier: "cheap" },
  { name: "Gemini 2.5 Flash-Lite", provider: "Google", input: 0.1, output: 0.4, tier: "cheap" },
  // xAI
  { name: "Grok 4.6", provider: "xAI", input: 2.0, output: 6.0, tier: "mid" },
  // Mistral
  { name: "Mistral Medium 3.5", provider: "Mistral", input: 1.5, output: 7.5, tier: "mid" },
  { name: "Mistral Small 4", provider: "Mistral", input: 0.15, output: 0.6, tier: "cheap" },
  // DeepSeek
  { name: "DeepSeek V4-Pro", provider: "DeepSeek", input: 0.66, output: 1.98, tier: "cheap" },
  { name: "DeepSeek V4-Flash", provider: "DeepSeek", input: 0.14, output: 0.28, tier: "cheap" },
  // Groq (hosted open-weight, fast inference)
  { name: "Groq Llama 3.3 70B", provider: "Groq", input: 0.59, output: 0.79, tier: "cheap" },
  { name: "Groq Llama 3.1 8B", provider: "Groq", input: 0.05, output: 0.08, tier: "cheap" },
  // Self-hosted
  { name: "Self-hosted (est.)", provider: "Self-hosted", input: 0.2, output: 0.2, tier: "cheap" },
];

// Manual-input mode: cost from query count x average tokens per query.
export function monthlyCost(
  model: ModelPricing,
  queries: number,
  inputTokensPerQuery: number,
  outputTokensPerQuery: number
): number {
  return monthlyCostFromTotals(
    model,
    queries * inputTokensPerQuery,
    queries * outputTokensPerQuery
  );
}

// Imported-usage mode: cost straight from total token volume. This is
// the one that matters for Anthropic import -- their usage API reports
// token totals per period with no per-request count, and the cost math
// is linear in tokens regardless of how many requests they came from,
// so totals are all this actually needs.
export function monthlyCostFromTotals(
  model: ModelPricing,
  totalInputTokens: number,
  totalOutputTokens: number
): number {
  const inputCost = (totalInputTokens / 1_000_000) * model.input;
  const outputCost = (totalOutputTokens / 1_000_000) * model.output;
  return inputCost + outputCost;
}

export function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
