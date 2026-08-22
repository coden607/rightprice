"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type LedgerEvent = { id: string; event_type: string; amount: number; direction: "credit" | "debit"; created_at: string };

function configured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
function dollars(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }

export function RewardsClient() {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [state, setState] = useState<"loading" | "signed_out" | "ready" | "unconfigured" | "error">("loading");

  useEffect(() => {
    if (!configured()) { setState("unconfigured"); return; }
    const supabase = createClient();
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setState("signed_out"); return; }
      const { data, error } = await supabase.from("ledger_events").select("id,event_type,amount,direction,created_at").order("created_at", { ascending: false }).limit(100);
      if (error) { setState("error"); return; }
      setEvents((data ?? []) as LedgerEvent[]); setState("ready");
    })();
  }, []);

  if (state === "unconfigured") return <div className="info-box">Rewards code is ready; connect Supabase and apply the migration to activate real account balances.</div>;
  if (state === "signed_out") return <div className="panel"><h3>Sign in to view rewards</h3><p className="muted">Only confirmed, attributable commerce rewards will appear here.</p><Link className="primary-button" href="/account">Sign in</Link></div>;
  if (state === "loading") return <div className="empty">Loading rewards…</div>;
  if (state === "error") return <div className="error-box">Could not load the rewards ledger.</div>;

  const credits = events.filter((e) => e.direction === "credit").reduce((sum, e) => sum + Number(e.amount), 0);
  const debits = events.filter((e) => e.direction === "debit").reduce((sum, e) => sum + Number(e.amount), 0);
  const balance = credits - debits;
  const cashback = events.filter((e) => e.event_type === "buyer_cashback_allocated" && e.direction === "credit").reduce((sum, e) => sum + Number(e.amount), 0);
  const referrals = events.filter((e) => e.event_type === "referrer_reward_allocated" && e.direction === "credit").reduce((sum, e) => sum + Number(e.amount), 0);

  return <>
    <div className="stats">
      <div className="stat"><span className="metric-label">Ledger balance</span><b>{dollars(balance)}</b></div>
      <div className="stat"><span className="metric-label">Cashback allocated</span><b>{dollars(cashback)}</b></div>
      <div className="stat"><span className="metric-label">Referral rewards</span><b>{dollars(referrals)}</b></div>
      <div className="stat"><span className="metric-label">Ledger events</span><b>{events.length}</b></div>
    </div>
    <div className="panel" style={{ marginTop: 16 }}>
      <h3>Recent ledger events</h3>
      {events.length === 0 ? <p className="muted">No confirmed reward events yet.</p> : events.slice(0, 15).map((event) => <div key={event.id} style={{ display:"flex", justifyContent:"space-between", gap:16, padding:"11px 0", borderBottom:"1px solid var(--line)" }}><span>{event.event_type.replaceAll("_", " ")}</span><b className={event.direction === "credit" ? "good" : ""}>{event.direction === "debit" ? "−" : "+"}{dollars(Number(event.amount))}</b></div>)}
    </div>
  </>;
}
