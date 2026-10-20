import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConnectorHealthPanel } from "@/components/connector-health-panel";
import { affiliateReadiness, affiliateReadinessSummary } from "@/lib/server/affiliate-readiness";
import { currentAdminEmail } from "@/lib/server/admin-auth";
import { revenueReadiness, revenueReadinessSummary } from "@/lib/server/revenue-readiness";

export const metadata: Metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

function stateLabel(state: string) {
  return state.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminPage() {
  const adminEmail = await currentAdminEmail();
  if (!adminEmail) redirect("/account");

  const programs = affiliateReadiness();
  const summary = affiliateReadinessSummary();
  const revenueGates = revenueReadiness();
  const revenueSummary = revenueReadinessSummary();

  return (
    <main className="section shell">
      <div className="section-head">
        <div>
          <h2>Operations</h2>
          <p>Connector health plus affiliate onboarding readiness. Secret values stay server-side.</p>
        </div>
      </div>

      <div className="info-box" style={{ marginBottom: 16 }}>
        <strong>Affiliate readiness:</strong>{" "}
        {summary.monetizing} monetizing · {summary.configured} configured · {summary.pendingApproval} pending approval ·{" "}
        {summary.needsCredentials} need credentials · {summary.blocked} blocked
      </div>

      <div className="info-box" style={{ marginBottom: 16 }}>
        <strong>Revenue launch gates:</strong> {revenueSummary.ready}/{revenueSummary.total} ready
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        {revenueGates.map((gate) => (
          <article key={gate.id} className="info-box">
            <strong>{gate.ready ? "✓" : "○"} {gate.label}</strong>
            <div style={{ marginTop: 4 }}>{gate.detail}</div>
            {gate.missing?.length ? (
              <div style={{ marginTop: 6 }}>Missing: <code>{gate.missing.join(", ")}</code></div>
            ) : null}
          </article>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        {programs.map((program) => (
          <article key={program.id} className="info-box">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong>{program.priority}. {program.name}</strong>
                <div style={{ marginTop: 4 }}>{stateLabel(program.state)}</div>
                {program.partnerStatus !== "unknown" ? (
                  <div style={{ marginTop: 4 }}>Program status: {program.partnerStatus}</div>
                ) : null}
              </div>
              <a href={program.applyUrl} target="_blank" rel="noreferrer">
                Open program
              </a>
            </div>

            {program.missing.length ? (
              <div style={{ marginTop: 8 }}>
                Missing configuration: <code>{program.missing.join(", ")}</code>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>Required technical configuration is present.</div>
            )}

            {program.notes ? <div style={{ marginTop: 8 }}>{program.notes}</div> : null}
          </article>
        ))}
      </div>

      <ConnectorHealthPanel />

      <div className="info-box" style={{ marginTop: 16 }}>
        Program signup, identity/tax verification, and acceptance of network terms must be completed by the account holder.
        RightPrice only enables tracking after approval and credentials are present.
      </div>
    </main>
  );
}
