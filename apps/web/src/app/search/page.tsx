import type { Metadata } from "next";
import { SearchClient } from "@/components/search-client";

export const metadata: Metadata = { title: "Compare prices" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <main className="search-page shell">
      <div className="section-head">
        <div>
          <h2>Compare purchase options</h2>
          <p>Move between value, price, speed, trust, cashback and local pickup instantly.</p>
        </div>
      </div>
      <SearchClient initialQuery={q} />
    </main>
  );
}
