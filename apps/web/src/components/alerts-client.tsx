"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SavedSearch = { id: string; query: string; created_at: string };
type PriceAlert = { id: string; saved_search_id: string | null; target_price: number | null; local_only: boolean; enabled: boolean; last_triggered_at: string | null; created_at: string };
type Notification = { id: string; title: string; body: string; href: string | null; read_at: string | null; created_at: string };

type State = "loading" | "signed_out" | "ready" | "unconfigured" | "error";

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

function dollars(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function AlertsClient({ initialQuery }: { initialQuery: string }) {
  const [state, setState] = useState<State>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [targetPrice, setTargetPrice] = useState("");
  const [localOnly, setLocalOnly] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!configured()) { setState("unconfigured"); return; }
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setState("signed_out"); return; }
    setUserId(auth.user.id);
    const [{ data: searches, error: searchError }, { data: alertRows, error: alertError }, { data: notes, error: noteError }] = await Promise.all([
      supabase.from("saved_searches").select("id,query,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("price_alerts").select("id,saved_search_id,target_price,local_only,enabled,last_triggered_at,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("notifications").select("id,title,body,href,read_at,created_at").order("created_at", { ascending: false }).limit(30)
    ]);
    if (searchError || alertError || noteError) { setState("error"); return; }
    setSavedSearches((searches ?? []) as SavedSearch[]);
    setAlerts((alertRows ?? []) as PriceAlert[]);
    setNotifications((notes ?? []) as Notification[]);
    setState("ready");
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createAlert(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;
    const cleanQuery = query.trim();
    const price = Number(targetPrice);
    if (cleanQuery.length < 2 || !Number.isFinite(price) || price <= 0) {
      setMessage("Enter a shopping request and a target price greater than zero.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { data: saved, error: saveError } = await supabase
      .from("saved_searches")
      .insert({ user_id: userId, query: cleanQuery, intent: { rawQuery: cleanQuery } })
      .select("id")
      .single();
    if (saveError || !saved) {
      setMessage("Could not save this search.");
      setSaving(false);
      return;
    }
    const { error: alertError } = await supabase.from("price_alerts").insert({
      user_id: userId,
      saved_search_id: saved.id,
      target_price: Math.round(price * 100) / 100,
      local_only: localOnly,
      enabled: true
    });
    if (alertError) {
      await supabase.from("saved_searches").delete().eq("id", saved.id);
      setMessage("Could not create the price alert.");
      setSaving(false);
      return;
    }
    setTargetPrice("");
    setMessage("Price alert created.");
    setSaving(false);
    await load();
  }

  async function deleteAlert(alert: PriceAlert) {
    const supabase = createClient();
    const { error } = await supabase.from("price_alerts").delete().eq("id", alert.id);
    if (!error && alert.saved_search_id) await supabase.from("saved_searches").delete().eq("id", alert.saved_search_id);
    setMessage(error ? "Could not remove that alert." : "Alert removed.");
    if (!error) await load();
  }

  async function markRead(note: Notification) {
    if (note.read_at) return;
    const supabase = createClient();
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", note.id);
    setNotifications((current) => current.map((item) => item.id === note.id ? { ...item, read_at: new Date().toISOString() } : item));
  }

  if (state === "unconfigured") return <div className="info-box">Price alerts are coded and ready. Connect Supabase, apply the migration and set CRON_SECRET to activate persistent alerts.</div>;
  if (state === "signed_out") return <div className="panel"><h3>Sign in to create alerts</h3><p className="muted">Your saved searches and alert history are private to your account.</p><Link className="primary-button" href="/account">Sign in</Link></div>;
  if (state === "loading") return <div className="empty">Loading alerts…</div>;
  if (state === "error") return <div className="error-box">Could not load alerts. Check the Supabase migration and connection.</div>;

  const searchById = new Map(savedSearches.map((item) => [item.id, item]));
  return (
    <div className="stack-grid">
      <section className="panel">
        <h3>Create target-price alert</h3>
        <form className="form-stack" onSubmit={createAlert}>
          <label>Shopping request<input value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={300} placeholder="e.g. AirPods Pro 2 new" required /></label>
          <label>Alert me at or below<input value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="150.00" required /></label>
          <label className="check-row"><input checked={localOnly} onChange={(event) => setLocalOnly(event.target.checked)} type="checkbox" /> Local pickup only</label>
          <button className="primary-button" disabled={saving} type="submit"><Bell size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />{saving ? "Saving…" : "Create alert"}</button>
        </form>
        {message ? <div className="info-box" style={{ marginTop: 12 }}>{message}</div> : null}
      </section>

      <section className="panel">
        <h3>Active alerts</h3>
        {alerts.length === 0 ? <p className="muted">No alerts yet.</p> : alerts.map((alert) => {
          const saved = alert.saved_search_id ? searchById.get(alert.saved_search_id) : undefined;
          return <div className="row-item" key={alert.id}>
            <div><b>{saved?.query ?? "Saved product alert"}</b><div className="muted">{alert.target_price != null ? `At or below ${dollars(Number(alert.target_price))}` : "Price-drop alert"}{alert.local_only ? " · local only" : ""}{alert.last_triggered_at ? ` · last matched ${new Date(alert.last_triggered_at).toLocaleDateString()}` : ""}</div></div>
            <button aria-label="Delete alert" className="icon-button" type="button" onClick={() => void deleteAlert(alert)}><Trash2 size={16} /></button>
          </div>;
        })}
      </section>

      <section className="panel wide-panel">
        <h3>Notifications</h3>
        {notifications.length === 0 ? <p className="muted">No price alerts have fired yet.</p> : notifications.map((note) => (
          <div className={`row-item ${note.read_at ? "" : "unread"}`} key={note.id}>
            <div>
              {note.href ? <Link href={note.href} onClick={() => void markRead(note)}><b>{note.title}</b></Link> : <b>{note.title}</b>}
              <div className="muted">{note.body}</div>
            </div>
            <button aria-label="Mark notification read" className="icon-button" type="button" disabled={Boolean(note.read_at)} onClick={() => void markRead(note)}><Check size={16} /></button>
          </div>
        ))}
      </section>
    </div>
  );
}
