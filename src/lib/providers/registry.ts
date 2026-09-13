import type { UsageAdapter } from "./types";
import { openai } from "./openai";
import { anthropic } from "./anthropic";

// To add a new provider (Groq, a self-hosted logging endpoint, etc.):
// 1. Write lib/providers/<name>.ts implementing UsageAdapter (see types.ts).
// 2. Add it to this map with a short id.
// That's it -- the API route and the UI both loop over this registry,
// so nothing else needs to change.
export const providers: Record<string, UsageAdapter> = {
  openai,
  anthropic,
};

export type ProviderId = keyof typeof providers;
