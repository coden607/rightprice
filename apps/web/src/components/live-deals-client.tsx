"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Deal = { query: string; title: string; retailerName: string; price: number; savings: number; currency: string };

const searches = ["wireless earbuds cheapest", "cordless impact driver cheapest", "robot vacuum cheapest"];

function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount); }
  catch { return `$${amount.toFixed(2)}`; }
}

export function LiveDealsClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void Promise.all(searches.map(async (query) => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&preset=cheapest`, { cache: "no-store" });
      if (!response.ok) return null;
      const body = await response.json() as { offers?: Array<{ title:string; retailerName:string; effectiveCost:{amount:number;currency:string} }> };
      const offers = body.offers ?? [];
      if (!offers.length) return null;
      const best = offers[0];
      const highest = Math.max(...offers.map((offer) => offer.effectiveCost.amount));
      return { query, title:best.title, retailerName:best.retailerName, price:best.effectiveCost.amount, savings:Math.max(0,highest-best.effectiveCost.amount), currency:best.effectiveCost.currency };
    })).then((results) => { if (active) { setDeals(results.filter(Boolean) as Deal[]); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="panel"><p className="muted">Checking live sources for deal examples…</p></div>;
  if (!deals.length) return <div className="panel"><p className="muted">Live sources are not enabled yet. Deal discovery will populate automatically as approved suppliers are activated.</p></div>;
  return <div className="grid-3">{deals.map((deal) => <Link className="feature-card" href={`/search?q=${encodeURIComponent(deal.query)}&preset=cheapest`} key={deal.query}><div className="eyebrow">Live comparison</div><h3>{deal.title}</h3><p>{deal.retailerName} · {money(deal.price,deal.currency)} effective</p>{deal.savings > 0 ? <p className="good">Up to {money(deal.savings,deal.currency)} below the highest checked offer</p> : null}</Link>)}</div>;
}
