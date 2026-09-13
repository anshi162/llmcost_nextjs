# RouteCost — LLM Cost & Routing Calculator

## Running it locally

You need Node.js 18+ and npm.

```sh
npm install
npm run dev
```

Open `http://localhost:3000` (check your terminal output — the port may
differ if 3000 is already in use).

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## LLM cost calculator logic

- `src/lib/pricing.ts` — 17 models across 8 providers, pricing dated in a
  comment at the top. Verify against provider pricing pages before
  trusting the numbers for anything real.
- `src/lib/providers/` — one adapter per usage-data provider
  (`openai.ts`, `anthropic.ts`), sharing a `UsageAdapter` interface
  (`types.ts`) and looked up by id via `registry.ts`.
- `src/lib/usage.server.ts` — a TanStack Start server function
  (`createServerFn`) that fetches real usage from whichever provider's
  Admin API. Runs server-side only; the browser calls it like a normal
  async function and TanStack handles the RPC.

### Real usage import — only for API-billed orgs

A subscription seat (Claude Pro/Max/Team, ChatGPT Plus/Team, or a flat
company plan) has no per-token usage API to call — this feature only
applies if your org is billed by API usage.

**Set it up once, server-side, so Import needs no typing:**

```sh
cp .env.example .env
# fill in OPENAI_ADMIN_KEY and/or ANTHROPIC_ADMIN_KEY
npm run dev
```

Get an Admin key (not your regular API key) from:
- OpenAI: Org Settings → Admin Keys (`sk-admin-...`)
- Anthropic: Console → Organization Settings (`sk-ant-admin...`)

Both are read-only for usage/billing — they can't run inference.

A key pasted into the field on the page always overrides the
server-configured one for that request, useful for a shared deployment
where you don't want a standing key on the server for everyone who opens
the page.

### Adding a third provider

1. `src/lib/providers/<name>.ts` — implement `UsageAdapter`.
2. Add one line to `src/lib/providers/registry.ts`.
3. Add one line to `IMPORT_PROVIDERS` in `src/routes/index.tsx`.

No changes needed to `usage.server.ts` or the rest of the UI.

