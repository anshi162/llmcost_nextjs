import type { UsageAdapter } from "./types";

export const anthropic: UsageAdapter = {
  name: "Anthropic",
  keyPrefix: "sk-ant-admin",
  envVar: "ANTHROPIC_ADMIN_KEY",

  async fetchUsage(apiKey, days) {
    const startingAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch(
      `https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=${encodeURIComponent(
        startingAt
      )}&bucket_width=1d&limit=${days}`,
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // No per-request count in this response -- only token totals per
    // bucket/model. That's fine: the app computes cost from totals for
    // every provider, so no reconstruction is needed here.
    for (const bucket of data.data ?? []) {
      for (const result of bucket.results ?? []) {
        totalInputTokens +=
          (result.uncached_input_tokens ?? 0) + (result.cache_read_input_tokens ?? 0);
        totalOutputTokens += result.output_tokens ?? 0;
      }
    }

    if (totalInputTokens === 0 && totalOutputTokens === 0) {
      throw new Error(`No usage found in the last ${days} days for this org.`);
    }

    return { totalInputTokens, totalOutputTokens };
  },
};
