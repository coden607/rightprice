import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Deals" };

const dealSearches = [
  ["Fast tech", "wireless earbuds fastest reputable seller"],
  ["Tool value", "cordless impact driver cheapest"],
  ["Local TV", "55 inch 4k tv local pickup under $400"],
  ["Open-box savings", "laptop open box cheapest"],
  ["Cashback hunt", "robot vacuum best cashback"],
  ["Budget essentials", "portable power bank under $30 cheapest"]
];

export default function DealsPage() {
  return (
    <main className="section shell">
      <div className="section-head"><div><h2>Deal discovery</h2><p>Live deal feeds will be driven by normalized price history; these launch shortcuts exercise the ranking engine now.</p></div></div>
      <div className="grid-3">
        {dealSearches.map(([title, query]) => (
          <Link className="feature-card" href={`/search?q=${encodeURIComponent(query)}`} key={title}>
            <div className="eyebrow">Explore</div>
            <h3>{title}</h3>
            <p>{query}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
