"use client";

import Link from "next/link";
import { decodeCollection } from "@/lib/client/shopping-memory";

function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount); }
  catch { return `$${amount.toFixed(2)}`; }
}

export function CollectionClient({ encoded }: { encoded: string }) {
  const items = decodeCollection(encoded);
  if (!items.length) return <div className="panel empty-state"><h3>This shared list is invalid or empty.</h3><Link className="primary-button" href="/search">Start a new search</Link></div>;
  return <div className="panel"><div className="saved-list">{items.map((item) => <article className="saved-row" key={item.id}><div><b>{item.title}</b><div className="muted">{item.retailerName}</div></div><div><span className="metric-label">Shared snapshot</span><div>{money(item.total,item.currency)} · <span className="good">{money(item.effective,item.currency)} effective</span></div></div><Link className="primary-button" href={`/search?q=${encodeURIComponent(item.query)}`}>Refresh price</Link></article>)}</div><p className="muted small-note">Shared values are historical snapshots. Refresh each search for current price, shipping, availability and merchant terms.</p></div>;
}
