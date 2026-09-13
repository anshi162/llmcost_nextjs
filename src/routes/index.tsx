import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Info, KeyRound, Sparkles, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { MODELS, DEFAULT_PREMIUM, DEFAULT_CHEAP, monthlyCostFromTotals, fmtUSD } from "@/lib/pricing";
import { fetchProviderUsage } from "@/lib/usage.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RouteCost — LLM Cost & Routing Calculator" },
      {
        name: "description",
        content: "Estimate monthly LLM spend and compare savings from smart model routing and prompt caching.",
      },
      { property: "og:title", content: "RouteCost — LLM Cost & Routing Calculator" },
      {
        property: "og:description",
        content: "Estimate monthly LLM spend and compare savings from smart routing and prompt caching.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface ImportedTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
  source: string;
}

// To add a new usage-import provider: add one entry here, write a
// matching adapter in src/lib/providers/*.ts, and register it in
// src/lib/providers/registry.ts. Nothing else needs to change.
const IMPORT_PROVIDERS = [
  { id: "openai", label: "OpenAI Admin API key" },
  { id: "anthropic", label: "Anthropic Admin API key" },
];

function Index() {
  // --- Manual usage inputs ---
  const [users, setUsers] = useState(1000);
  const [queriesPerUser, setQueriesPerUser] = useState(50);
  const [inputTokens, setInputTokens] = useState(2000);
  const [outputTokens, setOutputTokens] = useState(500);

  const [premiumName, setPremiumName] = useState(DEFAULT_PREMIUM.name);
  const [cheapName, setCheapName] = useState(DEFAULT_CHEAP.name);
  const [routing, setRouting] = useState(60);
  const [cache, setCache] = useState(20);

  const [importedTotals, setImportedTotals] = useState<ImportedTotals | null>(null);
  const [compareModelName, setCompareModelName] = useState(DEFAULT_PREMIUM.name);

  const premium = MODELS.find((m) => m.name === premiumName) ?? DEFAULT_PREMIUM;
  const cheap = MODELS.find((m) => m.name === cheapName) ?? DEFAULT_CHEAP;

  const effectiveInputTokens = importedTotals ? importedTotals.totalInputTokens : users * queriesPerUser * inputTokens;
  const effectiveOutputTokens = importedTotals ? importedTotals.totalOutputTokens : users * queriesPerUser * outputTokens;
  const totalQueries = Math.max(0, users * queriesPerUser);

  const totals = useMemo(() => {
    const premiumCost = monthlyCostFromTotals(premium, effectiveInputTokens, effectiveOutputTokens);
    const cheapShare = routing / 100;
    const routed =
      monthlyCostFromTotals(cheap, effectiveInputTokens * cheapShare, effectiveOutputTokens * cheapShare) +
      monthlyCostFromTotals(premium, effectiveInputTokens * (1 - cheapShare), effectiveOutputTokens * (1 - cheapShare));
    const final = routed * (1 - cache / 100);
    const routingSavings = premiumCost - routed;
    const cacheSavings = routed - final;
    const savings = premiumCost - final;
    const savingsRate = premiumCost > 0 ? (savings / premiumCost) * 100 : 0;
    return { premiumCost, routed, final, routingSavings, cacheSavings, savings, savingsRate };
  }, [premium, cheap, effectiveInputTokens, effectiveOutputTokens, routing, cache]);

  const comparison = useMemo(
    () =>
      MODELS.map((m) => ({ model: m, cost: monthlyCostFromTotals(m, effectiveInputTokens, effectiveOutputTokens) })).sort(
        (a, b) => a.cost - b.cost,
      ),
    [effectiveInputTokens, effectiveOutputTokens],
  );
  const maxCompareCost = Math.max(...comparison.map((c) => c.cost), 1);
  const compareModel = MODELS.find((m) => m.name === compareModelName);
  const compareModelCost = compareModel ? monthlyCostFromTotals(compareModel, effectiveInputTokens, effectiveOutputTokens) : 0;

  return (
    <main className="route-cost min-h-screen overflow-hidden bg-background text-foreground">
      <div className="kinetic-field" aria-hidden="true" />
      <div className="kinetic-plane kinetic-plane-left" aria-hidden="true" />
      <div className="kinetic-plane kinetic-plane-right" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-8 lg:py-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="logo-mark">Σ</div>
            <div>
              <p className="font-display text-lg font-bold leading-none">RouteCost</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                LLM spend planner
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-pill hidden sm:inline-flex">Monthly estimate</span>
            <span className="live-pill"><span className="live-dot" />Live calc</span>
          </div>
        </header>

        <section className="mb-8 mt-12 max-w-3xl sm:mt-16">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand">
            <Sparkles className="size-3.5" /> Cost intelligence
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            What your <span className="gradient-text">model routing</span> actually costs.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Model your monthly LLM spend, then see exactly how smart routing and prompt caching reduce the bill.
            For API-billed usage, not subscription seats.
          </p>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-5">
            <section className="glass-panel p-5 sm:p-6">
              <SectionHeading title="Monthly usage" label={importedTotals ? "imported" : `${totalQueries.toLocaleString()} queries`} />

              {importedTotals ? (
                <div className="mt-5 rounded-xl border border-border bg-white/[0.03] p-4 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Total monthly input tokens</span>
                    <span className="font-display font-semibold tabular-nums">{Math.round(effectiveInputTokens).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Total monthly output tokens</span>
                    <span className="font-display font-semibold tabular-nums">{Math.round(effectiveOutputTokens).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    From {importedTotals.source}, extrapolated to 30 days.{" "}
                    <button className="underline" type="button" onClick={() => setImportedTotals(null)}>
                      Clear and use manual inputs
                    </button>
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <NumberField label="Users" value={users} onChange={setUsers} />
                  <NumberField label="Queries / user / month" value={queriesPerUser} onChange={setQueriesPerUser} />
                  <NumberField label="Input tokens / query" value={inputTokens} onChange={setInputTokens} />
                  <NumberField label="Output tokens / query" value={outputTokens} onChange={setOutputTokens} />
                </div>
              )}

              <div className="mt-6 border-t border-border pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Import real usage</p>
                  <span className="text-[11px] text-muted-foreground">Optional · keys are never stored</span>
                </div>
                <div className="space-y-3">
                  {IMPORT_PROVIDERS.map((p) => (
                    <ImportRow key={p.id} providerId={p.id} label={p.label} onImported={setImportedTotals} />
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                  Needs an Admin API key (org-level, read-only for billing) — not your regular API key. Works only for
                  API-billed orgs; subscription plans (Pro/Max/Team) have no usage API to call.
                </p>
              </div>
            </section>

            <section className="glass-panel p-5 sm:p-6">
              <SectionHeading title="Cost by model" label={`${MODELS.length} models`} />

              <div className="mt-5">
                <label className="model-select">
                  <span className="field-label">Look up a model</span>
                  <span className="relative mt-2 block">
                    <select
                      className="w-full appearance-none bg-transparent pr-8 font-display text-base font-bold outline-none"
                      value={compareModelName}
                      onChange={(event) => setCompareModelName(event.target.value)}
                    >
                      {MODELS.map((m) => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-0 top-1 size-4" />
                  </span>
                  {compareModel && (
                    <span className="mt-1 block text-xs text-muted-foreground">{compareModel.provider}</span>
                  )}
                </label>

                {compareModel && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-end justify-between gap-3">
                      <span className="font-semibold">{compareModel.name}</span>
                      <span className="font-display text-2xl font-bold tabular-nums">{fmtUSD(compareModelCost)}/mo</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="cost-bar" style={{ width: `${(compareModelCost / maxCompareCost) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ModelSelect
                  label="Premium model"
                  tone="brand"
                  value={premiumName}
                  onChange={setPremiumName}
                  totalInputTokens={effectiveInputTokens}
                  totalOutputTokens={effectiveOutputTokens}
                />
                <ModelSelect
                  label="Cheap model"
                  tone="cool"
                  value={cheapName}
                  onChange={setCheapName}
                  totalInputTokens={effectiveInputTokens}
                  totalOutputTokens={effectiveOutputTokens}
                />
              </div>

              <details className="group mt-6">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-muted-foreground select-none">
                  <span className="transition-transform group-open:rotate-90">›</span>
                  See full ranking, all {comparison.length} models
                </summary>
                <div className="mt-4 space-y-4">
                  {comparison.map(({ model, cost }) => {
                    const width = (cost / maxCompareCost) * 100;
                    return (
                      <div key={model.name}>
                        <div className="mb-1.5 flex items-end justify-between gap-3 text-sm">
                          <span className="font-semibold">
                            {model.name} <span className="ml-1 text-xs font-normal text-muted-foreground">{model.provider}</span>
                          </span>
                          <span className="font-display tabular-nums text-muted-foreground">{fmtUSD(cost)}/mo</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div className="cost-bar" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </section>

            <section className="glass-panel p-5 sm:p-6">
              <SectionHeading title="Optimization levers" label="Drag to tune" />
              <div className="mt-6 grid gap-8 sm:grid-cols-2">
                <RangeControl label="Smart routing" helper="Share of token volume sent to the cheap model" value={routing} onChange={setRouting} tone="cool" />
                <RangeControl label="Prompt caching" helper="Repeat queries served from cache" value={cache} onChange={setCache} tone="accent" />
              </div>
            </section>
          </div>

          <aside className="results-panel lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="font-display font-bold">Monthly summary</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Updates as you adjust inputs</p>
              </div>
              <span className="live-pill"><span className="live-dot" />Live</span>
            </div>

            <div className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Final monthly cost</p>
              <p className="mt-2 font-display text-5xl font-bold tabular-nums sm:text-6xl">{fmtUSD(totals.final)}</p>

              <div className="savings-block mt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-cool">Monthly savings</p>
                <div className="mt-1 flex items-end justify-between gap-4">
                  <p className="font-display text-3xl font-bold tabular-nums text-cool">{fmtUSD(totals.savings)}</p>
                  <span className="savings-pill">−{totals.savingsRate.toFixed(1)}%</span>
                </div>
              </div>

              <dl className="mt-6 space-y-3 border-y border-border py-5 text-sm">
                <SummaryRow label="All-premium baseline" value={totals.premiumCost} />
                <SummaryRow label="Routing savings" value={totals.routingSavings} positive />
                <SummaryRow label="Cost after routing" value={totals.routed} />
                <SummaryRow label="Cache savings" value={totals.cacheSavings} positive />
              </dl>

              <div className="mt-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Naive vs optimized</p>
                <ComparisonBar label="Premium only" value={totals.premiumCost} width={100} />
                <ComparisonBar label="Routing + caching" value={totals.final} width={totals.premiumCost > 0 ? (totals.final / totals.premiumCost) * 100 : 0} optimized />
              </div>

              <div className="mt-6 flex gap-3 rounded-lg bg-secondary p-3.5 text-xs leading-5 text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-brand" />
                Estimates use your token mix and current illustrative model rates. Verify provider pricing before budgeting.
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row">
          <span>RouteCost · figures update live as you tune the model mix</span>
          <span>Illustrative estimates, not invoices</span>
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({ title, label }: { title: string; label: string }) {
  return <div className="flex items-center justify-between gap-4"><h2 className="font-display text-xl font-bold">{title}</h2><span className="section-label">{label}</span></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="field-label">{label}</span><input className="field-input" type="number" min="0" value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value)))} /></label>;
}

function ImportRow({
  providerId,
  label,
  onImported,
}: {
  providerId: string;
  label: string;
  onImported: (totals: ImportedTotals) => void;
}) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [usedServerKey, setUsedServerKey] = useState(false);

  async function handleImport() {
    setStatus("loading");
    setError("");
    try {
      const result = await fetchProviderUsage({
        data: { provider: providerId, apiKey: key || undefined, days: 7 },
      });
      const factor = 30 / result.days;
      setUsedServerKey(result.usingServerKey);
      onImported({
        totalInputTokens: Math.round(result.totalInputTokens * factor),
        totalOutputTokens: Math.round(result.totalOutputTokens * factor),
        source: `${result.source}, last ${result.days} days`,
      });
      setStatus("idle");
    } catch (e: any) {
      setError(e?.message ?? "Import failed");
      setStatus("error");
    }
  }

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="field-input pl-10"
            type="password"
            aria-label={label}
            placeholder={`${label} (leave blank to use server key)`}
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
        </label>
        <button className="action-button" type="button" disabled={status === "loading"} onClick={handleImport}>
          <Upload className="size-4" />
          {status === "loading" ? "Importing…" : "Import"}
        </button>
      </div>
      {status === "error" && <p className="mt-1.5 text-xs text-accent">{error}</p>}
      {usedServerKey && status === "idle" && <p className="mt-1.5 text-xs text-muted-foreground">Used the server-configured key.</p>}
    </div>
  );
}

function ModelSelect({
  label,
  value,
  onChange,
  tone,
  totalInputTokens,
  totalOutputTokens,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  tone: "brand" | "cool";
  totalInputTokens: number;
  totalOutputTokens: number;
}) {
  const model = MODELS.find((item) => item.name === value) ?? DEFAULT_PREMIUM;
  const cost = monthlyCostFromTotals(model, totalInputTokens, totalOutputTokens);
  return (
    <label className={`model-select model-select-${tone}`}>
      <span className="field-label">{label}</span>
      <span className="relative mt-2 block">
        <select className="w-full appearance-none bg-transparent pr-8 font-display text-base font-bold outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
          {MODELS.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1 size-4" />
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{model.provider} — {fmtUSD(cost)}/mo</span>
    </label>
  );
}

function RangeControl({ label, helper, value, onChange, tone }: { label: string; helper: string; value: number; onChange: (value: number) => void; tone: "cool" | "accent" }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3"><label className="font-semibold">{label}</label><span className={`font-display text-2xl font-bold text-${tone}`}>{value}%</span></div>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      <input className={`range-control range-${tone} mt-4 w-full`} aria-label={label} type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--range-value": `${value}%` } as React.CSSProperties} />
    </div>
  );
}

function SummaryRow({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className={`font-display font-semibold tabular-nums ${positive ? "text-cool" : ""}`}>{positive ? "−" : ""}{fmtUSD(value)}</dd></div>;
}

function ComparisonBar({ label, value, width, optimized = false }: { label: string; value: number; width: number; optimized?: boolean }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><span className="font-display font-semibold tabular-nums">{fmtUSD(value)}</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-secondary"><div className={optimized ? "comparison-fill optimized" : "comparison-fill"} style={{ width: `${Math.max(2, width)}%` }} /></div>
    </div>
  );
}
