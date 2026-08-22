"use client";

import { useEffect, useState } from "react";

type Health = { connectorId: string; ok: boolean; message: string; checkedAt: string };
type Response = { status: string; connectors: Health[] };

export function ConnectorHealthPanel() {
  const [data, setData] = useState<Response | null>(null);
  useEffect(() => { void fetch("/api/health", { cache:"no-store" }).then((r) => r.json()).then(setData).catch(() => setData(null)); }, []);
  if (!data) return <div className="panel">Checking connector health…</div>;
  return <div className="panel"><h3>Commerce connectors</h3><p className="muted">Mode: {data.status}</p>{data.connectors.map((item) => <div key={item.connectorId} style={{ display:"flex", justifyContent:"space-between", gap:20, padding:"12px 0", borderBottom:"1px solid var(--line)" }}><div><b>{item.connectorId}</b><div className="muted">{item.message}</div></div><span className={item.ok ? "good" : "muted"}>{item.ok ? "READY" : "OFF"}</span></div>)}</div>;
}
