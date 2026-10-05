"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Share2, Trash2 } from "lucide-react";
import { encodeCollection, removeSavedOffer, savedOffers, type SavedOfferSnapshot } from "@/lib/client/shopping-memory";

function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount); }
  catch { return `$${amount.toFixed(2)}`; }
}

export function ListsClient() {
  const [items, setItems] = useState<SavedOfferSnapshot[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const refresh = () => setItems(savedOffers());
    refresh();
    window.addEventListener("rightprice:shopping-memory", refresh);
    return () => window.removeEventListener("rightprice:shopping-memory", refresh);
  }, []);

  async function share() {
    if (!items.length) return;
    const url = `${window.location.origin}/collection?items=${encodeURIComponent(encodeCollection(items))}`;
    if (navigator.share) {
      await navigator.share({ title: "My RightPrice list", url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setNotice("Share link copied.");
  }

  return (
    <div className="stack-grid">
      <section className="panel wide-panel">
        <div className="section-head compact-head"><div><h2>Saved offers</h2><p>Keep promising offers, then refresh the search before buying.</p></div><button className="secondary-button" disabled={!items.length} onClick={() => void share()}><Share2 size={15} style={{ verticalAlign: "-2px", marginRight: 5 }} /> Share list</button></div>
        {notice ? <div className="info-box">{notice}</div> : null}
        {!items.length ? <div className="empty-state"><p className="muted">Nothing saved yet.</p><Link className="primary-button" href="/search">Find something</Link></div> : (
          <div className="saved-list">{items.map((item) => (
            <article className="saved-row" key={item.id}>
              <div><b>{item.title}</b><div className="muted">{item.retailerName} · saved {new Date(item.savedAt).toLocaleDateString()}</div></div>
              <div><span className="metric-label">Snapshot</span><div>{money(item.total, item.currency)} <span className="good">({money(item.effective, item.currency)} effective)</span></div></div>
              <Link className="chip" href={`/search?q=${encodeURIComponent(item.query)}`}>Refresh</Link>
              <button className="icon-button" aria-label={`Remove ${item.title}`} onClick={() => setItems(removeSavedOffer(item.id))}><Trash2 size={15} /></button>
            </article>
          ))}</div>
        )}
      </section>
    </div>
  );
}
