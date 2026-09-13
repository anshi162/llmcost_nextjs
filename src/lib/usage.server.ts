import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { providers } from "@/lib/providers/registry";

const inputSchema = z.object({
  provider: z.string(),
  apiKey: z.string().optional(),
  days: z.number().int().positive().max(30).default(7),
});

// Server-only: this function's body never ships to the browser bundle.
// The client calls it like a normal async function; TanStack Start
// handles the RPC under the hood (with CSRF protection wired in via
// src/start.ts).
export const fetchProviderUsage = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const adapter = providers[data.provider];

    if (!adapter) {
      throw new Error(`Unknown usage provider "${data.provider}".`);
    }

    // Prefer a key pasted into the UI; fall back to a server-configured
    // env var so the app can be set up once and just clicked afterward.
    const serverKey = process.env[adapter.envVar];
    const apiKey = data.apiKey || serverKey;
    const usingServerKey = !data.apiKey && !!serverKey;

    if (!apiKey) {
      throw new Error(
        `No ${adapter.name} key available. Paste one, or set ${adapter.envVar} in your environment to skip this every time.`,
      );
    }

    if (!apiKey.startsWith(adapter.keyPrefix)) {
      throw new Error(
        `This needs a ${adapter.name} Admin API key (starts with "${adapter.keyPrefix}"), not a regular key.`,
      );
    }

    const totals = await adapter.fetchUsage(apiKey, data.days);

    return {
      ...totals,
      days: data.days,
      source: adapter.name,
      usingServerKey,
    };
  });
