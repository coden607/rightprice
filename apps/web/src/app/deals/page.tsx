import type { Metadata } from "next";
import Link from "next/link";
import { LiveDealsClient } from "@/components/live-deals-client";
export const metadata: Metadata = { title: "Deals" };
const dealSearches = [["Fast tech","wireless earbuds fastest reputable seller"],["Tool value","cordless impact driver cheapest"],["Local TV","55 inch 4k tv local pickup under $400"],["Open-box savings","laptop open box cheapest"],["Cashback hunt","robot vacuum best cashback"],["Budget essentials","portable power bank under $30 cheapest"]];
export default function DealsPage(){return <main className="section shell"><div className="section-head"><div><h2>Deal discovery</h2><p>Live examples use the same shopper-first search engine. Historical deal scoring activates as normalized price history accumulates.</p></div></div><LiveDealsClient/><div className="section-head subhead"><div><h2>Explore by intent</h2></div></div><div className="grid-3">{dealSearches.map(([title,query])=><Link className="feature-card" href={`/search?q=${encodeURIComponent(query)}`} key={title}><div className="eyebrow">Explore</div><h3>{title}</h3><p>{query}</p></Link>)}</div></main>;}
