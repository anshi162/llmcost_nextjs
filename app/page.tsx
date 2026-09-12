"use client";

import { useMemo, useState } from "react";
import { MODELS, monthlyCostFromTotals, fmtUSD, type ModelPricing } from "@/lib/pricing";

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono text-lg bg-transparent border-b border-rule pb-1.5 focus:outline-none focus:border-ink transition-colors w-full"
      />
    </label>
  );
}

function ModelSelect({
  label,
  value,
  onChange,
  totalInputTokens,
  totalOutputTokens,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  totalInputTokens: number;
  totalOutputTokens: number;
}) {
  const selected = MODELS.find((m) => m.name === value);
  const selectedCost = selected
    ? monthlyCostFromTotals(selected, totalInputTokens, totalOutputTokens)
    : 0;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono bg-transparent border-b border-rule pb-1.5 focus:outline-none focus:border-ink transition-colors w-full"
      >
        {MODELS.map((m) => (
          <option key={m.name} value={m.name}>{m.name}</option>
        ))}
      </select>
      {selected && (
        <span className="text-xs text-muted">
          {selected.provider} — {fmtUSD(selectedCost)}/mo
        </span>
      )}
    </label>
  );
}

function LedgerRow({
  label,
  sub,
  value,
  emphasis,
}: {
  label: string;
  sub?: string;
  value: string;
  emphasis?: "cost" | "savings" | "default";
}) {
  const color =
    emphasis === "cost" ? "text-cost" : emphasis === "savings" ? "text-savings" : "text-ink";
  return (
    <div className="flex items-baseline justify-between py-3 border-b border-rule">
      <div>
        <div className="text-[15px]">{label}</div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
      <div className={`font-mono text-lg ${color}`}>{value}</div>
    </div>
  );
}

interface ImportedTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
  source: string;
}

// To add a new usage-import provider in the UI: add one entry here and
// a matching adapter in lib/providers/*.ts + the registry. Nothing else
// in this file needs to change.
const IMPORT_PROVIDERS = [
  { id: "openai", label: "OpenAI Admin API key", placeholder: "sk-admin-..." },
  { id: "anthropic", label: "Anthropic Admin API key", placeholder: "sk-ant-admin-..." },
];

function ImportRow({
  id,
  label,
  placeholder,
  onImported,
}: {
  id: string;
  label: string;
  placeholder: string;
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
      const res = await fetch(`/api/usage/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key || undefined, days: 7 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");

      const factor = 30 / json.days;
      setUsedServerKey(!!json.usingServerKey);
      onImported({
        totalInputTokens: Math.round(json.totalInputTokens * factor),
        totalOutputTokens: Math.round(json.totalOutputTokens * factor),
        source: `${json.source}, last ${json.days} days`,
      });
      setStatus("idle");
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  return (
    <div>
      <div className="flex gap-3 items-end mb-2">
        <label className="flex-1 flex flex-col gap-1.5">
          <span className="text-sm text-muted">{label}</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={`${placeholder}  (leave blank to use server-configured key)`}
            className="font-mono text-sm bg-transparent border-b border-rule pb-1.5 focus:outline-none focus:border-ink transition-colors w-full"
          />
        </label>
        <button
          onClick={handleImport}
          disabled={status === "loading"}
          className="text-sm px-4 py-2 border border-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink hover:text-paper transition-colors whitespace-nowrap"
        >
          {status === "loading" ? "Importing..." : "Import"}
        </button>
      </div>
      {status === "error" && <div className="text-sm text-cost">{error}</div>}
      {usedServerKey && status === "idle" && (
        <div className="text-xs text-muted">Used the server-configured key.</div>
      )}
    </div>
  );
}

export default function Home() {
  // --- Manual inputs ---
  const [users, setUsers] = useState(1000);
  const [queriesPerUser, setQueriesPerUser] = useState(50);
  const [inputTokens, setInputTokens] = useState(500);
  const [outputTokens, setOutputTokens] = useState(300);

  const [premiumModelName, setPremiumModelName] = useState("Claude Sonnet 5");
  const [cheapModelName, setCheapModelName] = useState("Groq Llama 3.1 8B");
  const [pctCheap, setPctCheap] = useState(60);
  const [cacheHitRate, setCacheHitRate] = useState(20);

  const [importedTotals, setImportedTotals] = useState<ImportedTotals | null>(null);
  const [compareModelName, setCompareModelName] = useState("Claude Sonnet 5");

  const premiumModel = MODELS.find((m) => m.name === premiumModelName)!;
  const cheapModel = MODELS.find((m) => m.name === cheapModelName)!;

  const effectiveInputTokens = importedTotals
    ? importedTotals.totalInputTokens
    : users * queriesPerUser * inputTokens;
  const effectiveOutputTokens = importedTotals
    ? importedTotals.totalOutputTokens
    : users * queriesPerUser * outputTokens;

  const comparison = useMemo(
    () =>
      MODELS.map((m) => ({
        model: m,
        cost: monthlyCostFromTotals(m, effectiveInputTokens, effectiveOutputTokens),
      })).sort((a, b) => a.cost - b.cost),
    [effectiveInputTokens, effectiveOutputTokens]
  );

  const maxCompareCost = Math.max(...comparison.map((c) => c.cost), 1);

  const compareModel = MODELS.find((m) => m.name === compareModelName);
  const compareModelCost = compareModel
    ? monthlyCostFromTotals(compareModel, effectiveInputTokens, effectiveOutputTokens)
    : 0;

  const allPremiumCost = monthlyCostFromTotals(
    premiumModel,
    effectiveInputTokens,
    effectiveOutputTokens
  );

  const cheapShare = pctCheap / 100;
  const routedCost =
    monthlyCostFromTotals(
      cheapModel,
      effectiveInputTokens * cheapShare,
      effectiveOutputTokens * cheapShare
    ) +
    monthlyCostFromTotals(
      premiumModel,
      effectiveInputTokens * (1 - cheapShare),
      effectiveOutputTokens * (1 - cheapShare)
    );

  const routingSavings = allPremiumCost - routedCost;
  const cacheSavings = routedCost * (cacheHitRate / 100);
  const finalCost = routedCost - cacheSavings;
  const totalSavings = allPremiumCost - finalCost;
  const totalSavingsPct = allPremiumCost > 0 ? (totalSavings / allPremiumCost) * 100 : 0;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-14">
        <div className="text-xs text-muted font-mono mb-3">MONTHLY LLM SPEND — WORKSHEET</div>
        <h1 className="text-4xl leading-tight" style={{ fontWeight: 500 }}>
          LLM Cost &amp; Routing Calculator
        </h1>
        <p className="text-muted mt-3 max-w-lg">
          A ledger for what your LLM traffic actually costs — and how much
          routing simple queries to cheaper models, plus caching repeats,
          takes off the bill.
        </p>
      </header>

      {/* Import real usage */}
      <section className="mb-16">
        <h2 className="text-sm text-muted mb-2">Import real usage (optional)</h2>
        <p className="text-sm text-muted mb-6 max-w-md">
          Pull your last 7 days of actual usage instead of guessing the
          numbers below. Needs an <span className="font-mono">Admin</span> API
          key (org-level, only an Owner/Admin can create one, read-only for
          billing). Your key is sent to this app's server to call the
          provider and is never stored or logged.
        </p>

        <div className="space-y-5">
          {IMPORT_PROVIDERS.map((p) => (
            <ImportRow key={p.id} {...p} onImported={setImportedTotals} />
          ))}
        </div>

        {importedTotals && (
          <div className="text-sm text-savings mt-4">
            Using imported usage from {importedTotals.source}, extrapolated to 30 days.{" "}
            <button className="underline text-muted" onClick={() => setImportedTotals(null)}>
              Clear and use manual inputs
            </button>
          </div>
        )}
      </section>

      {/* Usage inputs */}
      <section className="mb-16">
        <h2 className="text-sm text-muted mb-5">Usage</h2>
        {importedTotals ? (
          <div className="py-3 border-b border-rule text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-muted">Total monthly input tokens (imported)</span>
              <span className="font-mono">{Math.round(effectiveInputTokens).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total monthly output tokens (imported)</span>
              <span className="font-mono">{Math.round(effectiveOutputTokens).toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <NumberField label="Users" value={users} onChange={setUsers} step={100} />
              <NumberField label="Queries / user / month" value={queriesPerUser} onChange={setQueriesPerUser} step={5} />
              <NumberField label="Avg. input tokens / query" value={inputTokens} onChange={setInputTokens} step={50} />
              <NumberField label="Avg. output tokens / query" value={outputTokens} onChange={setOutputTokens} step={50} />
            </div>
            <div className="mt-6 text-sm text-muted">
              Total monthly queries:{" "}
              <span className="font-mono text-ink">{(users * queriesPerUser).toLocaleString()}</span>
            </div>
          </>
        )}
      </section>

      {/* Cost comparison — single lookup + collapsible full list */}
      <section className="mb-16">
        <h2 className="text-sm text-muted mb-5">
          Cost by model, flat — every query on one model
        </h2>

        <ModelSelect
          label="Look up a model"
          value={compareModelName}
          onChange={setCompareModelName}
          totalInputTokens={effectiveInputTokens}
          totalOutputTokens={effectiveOutputTokens}
        />

        {compareModel && (
          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[15px]">
                {compareModel.name}
                <span className="text-muted text-xs ml-2">{compareModel.provider}</span>
              </span>
              <span className="font-mono text-2xl">{fmtUSD(compareModelCost)}</span>
            </div>
            <div className="h-1 bg-rule">
              <div
                className="h-1 bg-ink"
                style={{ width: `${(compareModelCost / maxCompareCost) * 100}%` }}
              />
            </div>
          </div>
        )}

        <details className="mt-6 group">
          <summary className="text-sm text-muted cursor-pointer select-none list-none flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">›</span>
            See full ranking, all {comparison.length} models
          </summary>
          <div className="mt-4">
            {comparison.map(({ model, cost }) => (
              <div key={model.name} className="py-3 border-b border-rule">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[15px]">
                    {model.name}
                    <span className="text-muted text-xs ml-2">{model.provider}</span>
                  </span>
                  <span className="font-mono text-lg">{fmtUSD(cost)}</span>
                </div>
                <div className="h-1 bg-rule">
                  <div
                    className="h-1 bg-ink"
                    style={{ width: `${(cost / maxCompareCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* Routing */}
      <section className="mb-16">
        <h2 className="text-sm text-muted mb-5">Smart routing</h2>
        <p className="text-sm text-muted mb-6 max-w-md">
          Send a share of traffic to a cheap model, keep the premium model
          for the rest.
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
          <ModelSelect
            label="Premium model"
            value={premiumModelName}
            onChange={setPremiumModelName}
            totalInputTokens={effectiveInputTokens}
            totalOutputTokens={effectiveOutputTokens}
          />
          <ModelSelect
            label="Cheap model"
            value={cheapModelName}
            onChange={setCheapModelName}
            totalInputTokens={effectiveInputTokens}
            totalOutputTokens={effectiveOutputTokens}
          />
        </div>
        <label className="flex flex-col gap-2 mb-8">
          <span className="text-sm text-muted">
            Routed to cheap model — <span className="font-mono text-ink">{pctCheap}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={pctCheap}
            onChange={(e) => setPctCheap(Number(e.target.value))}
          />
        </label>
        <LedgerRow label="All-premium baseline" value={fmtUSD(allPremiumCost)} emphasis="cost" />
        <LedgerRow label="With routing" value={fmtUSD(routedCost)} />
        <LedgerRow
          label="Routing savings"
          sub={`${((routingSavings / allPremiumCost) * 100 || 0).toFixed(1)}% off baseline`}
          value={fmtUSD(routingSavings)}
          emphasis="savings"
        />
      </section>

      {/* Caching */}
      <section className="mb-16">
        <h2 className="text-sm text-muted mb-5">Caching</h2>
        <p className="text-sm text-muted mb-6 max-w-md">
          A share of queries are repeats — serve them from cache instead of
          calling a model again.
        </p>
        <label className="flex flex-col gap-2 mb-8">
          <span className="text-sm text-muted">
            Cache hit rate — <span className="font-mono text-ink">{cacheHitRate}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={90}
            value={cacheHitRate}
            onChange={(e) => setCacheHitRate(Number(e.target.value))}
          />
        </label>
        <LedgerRow label="Routed cost, pre-cache" value={fmtUSD(routedCost)} />
        <LedgerRow label="Cache savings" value={fmtUSD(cacheSavings)} emphasis="savings" />
        <LedgerRow label="Final monthly cost" value={fmtUSD(finalCost)} emphasis="cost" />
      </section>

      {/* Summary */}
      <section className="mb-8">
        <h2 className="text-sm text-muted mb-6">
          Naive to optimized — {totalSavingsPct.toFixed(1)}% saved
        </h2>
        <div className="space-y-5">
          {[
            { label: "All-premium (naive)", value: allPremiumCost, color: "bg-cost" },
            { label: "+ Smart routing", value: routedCost, color: "bg-ink" },
            { label: "+ Routing & caching", value: finalCost, color: "bg-savings" },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-baseline justify-between mb-1.5 text-sm">
                <span className="text-muted">{row.label}</span>
                <span className="font-mono text-ink">{fmtUSD(row.value)}</span>
              </div>
              <div className="h-3 bg-rule">
                <div
                  className={`h-3 ${row.color}`}
                  style={{ width: `${(row.value / allPremiumCost) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-xs text-muted pt-10 border-t border-rule">
        Pricing figures are illustrative estimates — verify against current
        provider pricing pages before relying on these numbers.
      </footer>
    </main>
  );
}
