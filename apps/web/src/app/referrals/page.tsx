import type { Metadata } from "next";
import { ReferralsClient } from "@/components/referrals-client";

export const metadata: Metadata = { title: "Refer & Earn" };

export default function ReferralsPage() {
  return <main className="section shell"><div className="section-head"><div><h2>Refer & earn</h2><p>Direct rewards are tied to legitimate qualifying purchases and only activate when the merchant program permits them.</p></div></div><ReferralsClient /></main>;
}
