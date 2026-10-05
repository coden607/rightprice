"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { clearCompareOffers, compareOffers, removeCompareOffer, type SavedOfferSnapshot } from "@/lib/client/shopping-memory";

function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount); }
  catch { return `$${amount.toFixed(2)}`; }
}

export function CompareClient() {
  const [items, setItems] = useState<SavedOfferSnapshot[]>([]);
  useEffect(() => {
    const refresh = () => setItems(compareOffers());
    refresh();
    window.addEventListener("rightprice:shopping-memory", refresh);
    return () => window.removeEventListener("rightprice:shopping-memory", refresh);
  }, []);

  if (!items.length) {
    return <div className="panel empty-state"><h3>No offers selected yet</h3><p className="muted">Use “Compare” on search results to add up to four offers.</p><Link className="primary-button" href="/search">Search products</Link></div>;
  }

  return (
    <div className="panel">
      <div className="summary-row"><span>{items.length} saved comparison snapshot{items.length === 1 ? "" : "s"}</span><button className="secondary-button" onClick={() => { clearCompareOffers(); setItems([]); }}>Clear all</button></div>
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead><tr><th>Offer</th><th>Pay now</th><th>Effective</th><th>Delivery</th><th>RP score</th><th>Refresh</th><th /></tr></thead>
          <tbody>{items.map((item) => (
            <tr key={item.id}>
              <td><b>{item.title}</b><div className="muted">{item.retailerName}</div></td>
              <td>{money(item.total, item.currency)}</td>
              <td className="good">{money(item.effective, item.currency)}</td>
              <td>{item.deliveryLabel}</td>
              <td>{item.score ? `${item.score}/100` : "—"}</td>
              <td><Link className="chip" href={`/search?q=${encodeURIComponent(item.query)}`}>Current prices</Link></td>
              <td><button className="icon-button" aria-label={`Remove ${item.title}`} onClick={() => setItems(removeCompareOffer(item.id))}><Trash2 size={15} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="muted small-note">Comparison entries are snapshots. RightPrice always refreshes prices and availability before you buy.</p>
    </div>
  );
}
