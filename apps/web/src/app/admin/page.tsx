import type { Metadata } from "next";
import { ConnectorHealthPanel } from "@/components/connector-health-panel";

export const metadata: Metadata = { title: "Operations" };

export default function AdminPage() {
  return <main className="section shell"><div className="section-head"><div><h2>Operations</h2><p>Connector diagnostics only. Sensitive program configuration and payouts remain server-side.</p></div></div><ConnectorHealthPanel /><div className="info-box" style={{ marginTop:16 }}>Before public launch, protect expanded admin functionality with a dedicated admin role/claim. This page intentionally exposes only non-secret connector health.</div></main>;
}
