"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";

type Preset = "best_overall" | "cheapest" | "fastest" | "trusted" | "cashback" | "local";
type CustomWeights = {
  price: number;
  delivery: number;
  trust: number;
  returns: number;
  cashback: number;
  local: number;
};

type SearchOffer = {
  id: string;
  title: string;
  retailerName: string;
  sellerName: string | null;
  sellerRating: number | null;
  itemPrice: { amount: number; currency: string };
  shipping: { amount: number; currency: string };
  cashback: { amount: number; currency: string } | null;
  totalBeforeCashback: { amount: number; currency: string };
  effectiveCost: { amount: number; currency: string };
  delivery: { minDays?: number; maxDays?: number; localPickup?: boolean; distanceMiles?: number } | null;
  returnDays: number | null;
  score: number;
  rankReason: string;
  isDemo: boolean;
  affiliateEligible: boolean;
  clickUrl: string;
};

type SearchResponse = {
  offers: SearchOffer[];
  connectorErrors: Array<{ connectorId: string; message: string }>;
  searchedConnectors: string[];
  durationMs: number;
  disclosure: string;
  ranking?: { mode: "custom" | "preset" };
  error?: string;
};

const presets: Array<{ id: Preset; label: string }> = [
  { id: "best_overall", label: "Best overall" },
  { id: "cheapest", label: "Cheapest" },
  { id: "fastest", label: "Fastest" },
  { id: "trusted", label: "Most trusted" },
  { id: "cashback", label: "Best cashback" },
  { id: "local", label: "Local pickup" }
];

const defaultCustomWeights: CustomWeights = {
  price: 40,
  delivery: 20,
  trust: 15,
  returns: 10,
  cashback: 10,
  local: 5
};

const weightFields: Array<{ key: keyof CustomWeights; label: string; help: string }> = [
  { key: "price", label: "Price", help: "Lower effective delivered cost" },
  { key: "delivery", label: "Delivery", help: "Faster arrival" },
  { key: "trust", label: "Seller trust", help: "Higher seller reputation" },
  { key: "returns", label: "Returns", help: "Longer return window" },
  { key: "cashback", label: "Cashback", help: "More permitted RightPrice Cash" },
  { key: "local", label: "Local pickup", help: "Nearby pickup availability" }
];

function usd(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function deliveryText(offer: SearchOffer): string {
  if (offer.delivery?.localPickup) {
    return offer.delivery.distanceMiles != null ? `Pickup · ${offer.delivery.distanceMiles.toFixed(1)} mi` : "Local pickup";
  }
  if (offer.delivery?.maxDays === 0) return "Today";
  if (offer.delivery?.maxDays === 1) return "~1 day";
  if (offer.delivery?.maxDays != null) return `~${offer.delivery.maxDays} days`;
  return "Check seller";
}

function appendWeights(params: URLSearchParams, weights?: CustomWeights) {
  if (!weights) return;
  params.set("wp", String(weights.price));
  params.set("wd", String(weights.delivery));
  params.set("wt", String(weights.trust));
  params.set("wr", String(weights.returns));
  params.set("wc", String(weights.cashback));
  params.set("wl", String(weights.local));
}

export function SearchClient({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [preset, setPreset] = useState<Preset>("best_overall");
  const [customOpen, setCustomOpen] = useState(false);
  const [draftWeights, setDraftWeights] = useState<CustomWeights>(defaultCustomWeights);
  const [appliedWeights, setAppliedWeights] = useState<CustomWeights | undefined>();
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string, p: Preset, custom?: CustomWeights) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q, preset: p });
      appendWeights(params, custom);
      const response = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as SearchResponse;
      if (!response.ok) throw new Error(body.error ?? "Search failed");
      setData(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (submittedQuery.trim().length >= 2) void search(submittedQuery, preset, appliedWeights);
  }, [appliedWeights, preset, search, submittedQuery]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = query.trim();
    if (clean.length < 2) return;
    setSubmittedQuery(clean);
    const url = new URL(window.location.href);
    url.searchParams.set("q", clean);
    window.history.replaceState({}, "", url);
    if (clean === submittedQuery) void search(clean, preset, appliedWeights);
  }

  function choosePreset(nextPreset: Preset) {
    setPreset(nextPreset);
    setAppliedWeights(undefined);
  }

  function applyCustomPriorities() {
    setAppliedWeights({ ...draftWeights });
    setCustomOpen(false);
  }

  return (
    <>
      <form className="search-box" onSubmit={submit}>
        <Search size={20} style={{ margin: "auto 0 auto 12px", color: "#718399" }} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search products" placeholder="Describe what you want and what matters..." minLength={2} required />
        <button className="primary-button" type="submit">{loading ? "Checking…" : "Compare"}</button>
      </form>

      <div className="preset-row" aria-label="Ranking mode">
        {presets.map((item) => (
          <button className={`preset-button ${!appliedWeights && preset === item.id ? "active" : ""}`} type="button" key={item.id} onClick={() => choosePreset(item.id)}>
            {item.label}
          </button>
        ))}
        <button className={`preset-button ${appliedWeights ? "active" : ""}`} type="button" onClick={() => setCustomOpen((open) => !open)}>
          <SlidersHorizontal size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 5 }} />
          My priorities
        </button>
      </div>

      {customOpen ? (
        <section className="priority-panel" aria-label="Custom shopping priorities">
          <div className="priority-head">
            <div>
              <b>What matters most to you?</b>
              <p>RightPrice normalizes these values automatically. Affiliate commission is never one of the inputs.</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => setDraftWeights(defaultCustomWeights)}>Reset</button>
          </div>
          <div className="priority-grid">
            {weightFields.map((field) => (
              <label className="priority-control" key={field.key}>
                <span><b>{field.label}</b><small>{field.help}</small></span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={draftWeights[field.key]}
                  onChange={(event) => setDraftWeights((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                />
                <output>{draftWeights[field.key]}</output>
              </label>
            ))}
          </div>
          <div className="priority-actions">
            <span className="muted">Higher numbers mean greater importance; they do not need to add to 100.</span>
            <button className="primary-button" type="button" onClick={applyCustomPriorities}>Apply my priorities</button>
          </div>
        </section>
      ) : null}

      {appliedWeights ? <div className="info-box">Custom ranking is active. Change a preset above to return to a standard ranking mode.</div> : null}
      {error && <div className="error-box">{error}</div>}
      {data?.connectorErrors.length ? <div className="error-box">Some stores could not be checked: {data.connectorErrors.map((item) => item.connectorId).join(", ")}. Available results are still shown.</div> : null}

      {data && (
        <div className="summary-row">
          <span>{data.offers.length} offers · checked {data.searchedConnectors.join(", ")} · {data.durationMs} ms</span>
          <span className="summary-actions"><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> Shopper-first ranking <a className="chip" href={`/alerts?q=${encodeURIComponent(submittedQuery)}`}>Set price alert</a></span>
        </div>
      )}

      {loading && !data ? <div className="empty">Checking available sources…</div> : null}
      {!loading && data && data.offers.length === 0 ? <div className="empty">No offers matched those constraints. Try relaxing the price, condition or local-pickup requirement.</div> : null}

      <div className="offer-list">
        {data?.offers.map((offer, index) => (
          <article className="offer-card" key={offer.id}>
            <div className="offer-rank">
              <div className={`rank-badge ${index === 0 ? "top" : ""}`}>{index + 1}</div>
              <div className="offer-title">
                <h3>{offer.title}</h3>
                <div className="retailer">
                  {offer.retailerName}
                  {offer.isDemo ? <span className="demo-tag">DEMO DATA</span> : null}
                  {index === 0 ? <span className="best-tag">BEST MATCH</span> : null}
                </div>
                <div className="retailer" title={offer.rankReason}>{offer.rankReason}</div>
              </div>
            </div>

            <div>
              <div className="metric-label">Pay now</div>
              <div className="metric-value">{usd(offer.totalBeforeCashback.amount, offer.totalBeforeCashback.currency)}</div>
              <div className="retailer">ship {offer.shipping.amount === 0 ? "free" : usd(offer.shipping.amount, offer.shipping.currency)}</div>
            </div>

            <div>
              <div className="metric-label">Effective</div>
              <div className="metric-value good">{usd(offer.effectiveCost.amount, offer.effectiveCost.currency)}</div>
              <div className="retailer">{offer.cashback?.amount ? `${usd(offer.cashback.amount)} cash back` : "no cashback"}</div>
            </div>

            <div>
              <div className="metric-label">Delivery</div>
              <div className="metric-value">{deliveryText(offer)}</div>
              <div className="retailer">{offer.returnDays ? `${offer.returnDays}-day returns` : "returns vary"}</div>
            </div>

            <div>
              <div className="metric-label">RP score</div>
              <div className="score">{offer.score}<small>/100</small></div>
              <div className="retailer">{offer.sellerRating != null ? `${offer.sellerRating}% seller` : "seller varies"}</div>
            </div>

            <div className="buy-cell">
              <a className="primary-button" href={offer.clickUrl} rel="nofollow sponsored" target="_blank">View offer <ExternalLink size={14} style={{ display: "inline", verticalAlign: "-2px" }} /></a>
              {offer.affiliateEligible ? <small className="retailer">Sponsored link; RightPrice may earn a commission.</small> : null}
            </div>
          </article>
        ))}
      </div>

      {data ? <p className="muted" style={{ fontSize: ".78rem", marginTop: 18 }}>{data.disclosure} Prices and availability can change; confirm final terms with the retailer before purchasing.</p> : null}
    </>
  );
}
