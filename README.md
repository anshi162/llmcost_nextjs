# LLM Cost & Routing Calculator

Models what your LLM **API usage** actually costs per month, across every
major provider, and shows how much smart-routing (sending simple queries
to a cheaper model) and caching (skipping repeat queries) can save.

---

## Who this is actually for (read this first)

There are two completely different things "using an LLM" can mean, and
this tool only applies to one of them.

**A subscription seat** (Claude Pro/Max/Team, ChatGPT Plus/Team, or a
company-wide plan like a flat $500/month Claude subscription) pays for
*people* to use Claude Code or a chat app interactively. It's a fixed,
seat-based cost — you already know the number, and it doesn't change
based on how much any one person uses it. **This calculator has nothing
to add here.**

**API billing (pay-per-token)** is for when a company *builds something*
that calls an LLM programmatically — a support bot, an internal
automation, an agent embedded in a product, serving the company's own
users or systems at scale. Every request costs real, variable money that
scales with volume. **This is what the calculator models.**

Most companies doing serious AI work have both, as separate budgets:
a subscription for developer productivity, and API spend for anything
they've actually shipped that calls a model on its own. If you work with
agent pipelines (LangGraph, an internal bot, anything calling an LLM
without a human typing each prompt), that's API spend — that's the
decision this tool is for.

---

## Quick start — running it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

**Requirements:** Node.js 18+ and npm. Check with `node -v` — if that
fails or shows an older version, install Node from
[nodejs.org](https://nodejs.org) first.

---

## Project structure

```
app/
  page.tsx                          # the entire calculator UI
  layout.tsx                        # fonts, page metadata
  globals.css                       # Tailwind + slider styling
  api/usage/[provider]/route.ts     # server route, serves every usage provider
lib/
  pricing.ts                        # model list, pricing, cost math
  providers/
    types.ts                        # shared interface every provider implements
    openai.ts                       # OpenAI usage adapter
    anthropic.ts                    # Anthropic usage adapter
    registry.ts                     # maps provider id -> adapter
package.json / tsconfig.json / tailwind.config.js / next.config.js / postcss.config.js
```

Everything under `app/` is the interface; everything under `lib/` is logic
that doesn't know or care about React — you could reuse `lib/pricing.ts`
or `lib/providers/` in a different frontend without changes.

---

## What the app does

1. **Usage inputs** — users, queries/user/month, avg. input/output tokens
   per query. Or skip this and import real numbers (see below).
2. **Cost lookup** — pick any of the 17 models to see its monthly cost;
   expand "see full ranking" for the complete sorted list.
3. **Smart routing** — split traffic by % between a cheap and a premium
   model, see the savings vs. an all-premium baseline.
4. **Caching** — apply a cache-hit-rate discount on top of the routed cost.
5. **Summary** — a shrinking cost bar showing naive → routed →
   routed+cached, with total % saved.

---

## Models included

17 models across 8 providers (OpenAI, Anthropic, Google, xAI, Mistral,
DeepSeek, Groq, self-hosted estimate), each tagged premium/mid/cheap.
Pricing lives in `lib/pricing.ts`, the `MODELS` array.

**Pricing goes stale fast.** The file is dated in a comment at the top —
check that date, and re-verify against provider pricing pages before
trusting the numbers for anything real (or showing them in an interview).

---

## Real usage import

Instead of guessing your numbers, you can pull real usage from OpenAI's or
Anthropic's Usage API and have the calculator auto-fill from it. This
only applies to API-billed orgs — see the section above if you're not
sure that's you.

### What you need

An **Admin API key** — not your regular API key:

| Provider | Key format | Where to get it |
|---|---|---|
| OpenAI | `sk-admin-...` | Org Settings → Admin Keys (Owner role required) |
| Anthropic | `sk-ant-admin...` | Anthropic Console → Organization settings (Admin role required) |

Both are **read-only for usage/billing** — they cannot run inference, so
using one here doesn't expose your ability to rack up model charges.

### How it works

1. Go to the "Import real usage" section at the top of the page.
2. Paste your Admin key into the OpenAI or Anthropic field, click Import.
3. The app calls `/api/usage/<provider>` (a route running on **your own
   server**, not the browser) which calls the provider, aggregates the
   last 7 days of token totals, and returns them.
4. The calculator's usage inputs are replaced with the imported totals,
   extrapolated to a 30-day month. Click "Clear and use manual inputs" to
   go back to typing numbers yourself.

### Why your key goes to a server route, not straight from the browser

An Admin key is a powerful, org-level secret. If the browser called the
provider directly, the key would sit in client-side JavaScript, visible to
anyone with devtools open. Routing it through `app/api/usage/[provider]/route.ts`
keeps it server-side: your browser talks to your own Next.js server over
HTTPS, the server calls the provider, and only the aggregated numbers
come back. The key is **never stored or logged** — it's used for one
request and discarded.

### Why OpenAI and Anthropic are computed differently under the hood

OpenAI's usage API returns a request count alongside token totals.
Anthropic's returns only token totals per period — no request count field
exists at all. Rather than build two different code paths, the app
computes cost from **total token volume** for both providers
(`monthlyCostFromTotals()` in `lib/pricing.ts`), since the cost math is
linear in tokens regardless of how many requests they came from. Routing
is applied as a % split of token volume for the same reason.


## Common setup issues

**"This needs an Admin API key, not a regular key"** — you pasted a
normal `sk-...` / `sk-ant-...` key. Admin keys have a distinct prefix
(`sk-admin-...` / `sk-ant-admin...`) and are created separately — see
"Real usage import" above.

---

## Notes on the numbers

- Pricing is illustrative and dated — see "Models included."
- Manual-input mode assumes uniform token counts per query; real traffic
  varies, so treat outputs as directional, not exact.
- The routing scenario models a flat %/volume split. A production router
  would classify queries by actual complexity rather than an arbitrary
  slider — a natural next step if extending this further.
- Caching is a flat hit-rate assumption, not real semantic-similarity
  matching against a cache store — same caveat applies.