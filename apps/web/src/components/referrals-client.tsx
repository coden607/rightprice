"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Edge = { id: string; status: string; attributed_at: string };

function configured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }

export function ReferralsClient() {
  const [state, setState] = useState<"loading"|"unconfigured"|"signed_out"|"ready"|"error">("loading");
  const [code, setCode] = useState("");
  const [edges, setEdges] = useState<Edge[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!configured()) { setState("unconfigured"); return; }
    const supabase = createClient();
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setState("signed_out"); return; }
      const [profile, referrals] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", auth.user.id).single(),
        supabase.from("referral_edges").select("id,status,attributed_at").eq("referrer_user_id", auth.user.id).order("attributed_at", { ascending: false })
      ]);
      if (profile.error || referrals.error) { setState("error"); return; }
      setCode(profile.data.referral_code ?? "");
      setEdges((referrals.data ?? []) as Edge[]);
      setState("ready");
    })();
  }, []);

  if (state === "unconfigured") return <div className="info-box">Referral attribution is implemented, including a 30-day first-party referral cookie and signup-edge creation. Connect Supabase to issue account-specific codes.</div>;
  if (state === "signed_out") return <div className="panel"><h3>Get your referral link</h3><p className="muted">Create/sign into your account first.</p><Link className="primary-button" href="/account">Sign in</Link></div>;
  if (state === "loading") return <div className="empty">Loading referral account…</div>;
  if (state === "error") return <div className="error-box">Could not load referral information.</div>;

  const link = `/r/${code}`;
  return <>
    <div className="panel">
      <span className="metric-label">Your referral link</span>
      <h3 style={{ overflowWrap:"anywhere" }}>{link}</h3>
      <button className="primary-button" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${link}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy link"}</button>
      <p className="muted">A referral signup never creates a payout by itself. Eligible rewards are allocated only after a legitimate merchant transaction is confirmed and the applicable program allows referral sharing.</p>
    </div>
    <div className="stats" style={{ marginTop:16 }}>
      <div className="stat"><span className="metric-label">Attributed users</span><b>{edges.filter((e) => e.status === "active").length}</b></div>
      <div className="stat"><span className="metric-label">Fraud holds</span><b>{edges.filter((e) => e.status === "fraud_hold").length}</b></div>
      <div className="stat"><span className="metric-label">Referral depth</span><b>1</b></div>
      <div className="stat"><span className="metric-label">Recruitment-only reward</span><b>$0</b></div>
    </div>
  </>;
}
