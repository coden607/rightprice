import type { Metadata } from "next";
import { AlertsClient } from "@/components/alerts-client";

export const metadata: Metadata = { title: "Price alerts" };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <main className="section shell">
      <div className="section-head">
        <div>
          <h2>Price alerts</h2>
          <p>Save a shopping request and get an in-app alert when RightPrice finds an offer at or below your target.</p>
        </div>
      </div>
      <AlertsClient initialQuery={q} />
    </main>
  );
}
