import type { Metadata } from "next";
import { CompareClient } from "@/components/compare-client";
export const metadata: Metadata = { title: "Compare offers" };
export default function ComparePage(){return <main className="section shell"><div className="section-head"><div><h2>Side-by-side compare</h2><p>Compare up to four saved offer snapshots and refresh each one before buying.</p></div></div><CompareClient/></main>;}
