import type { UsageAdapter } from "./types";

export const openai: UsageAdapter = {
  name: "OpenAI",
  keyPrefix: "sk-admin-",
  envVar: "OPENAI_ADMIN_KEY",

  async fetchUsage(apiKey, days) {
    const startTime = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    const res = await fetch(
      `https://api.openai.com/v1/organization/usage/completions?start_time=${startTime}&bucket_width=1d&limit=${days}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const bucket of data.data ?? []) {
      for (const result of bucket.results ?? []) {
        totalInputTokens += result.input_tokens ?? 0;
        totalOutputTokens += result.output_tokens ?? 0;
      }
    }

    if (totalInputTokens === 0 && totalOutputTokens === 0) {
      throw new Error(`No usage found in the last ${days} days for this org.`);
    }

    return { totalInputTokens, totalOutputTokens };
  },
};
