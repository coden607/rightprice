import type { Metadata } from "next";
import { RewardsClient } from "@/components/rewards-client";

export const metadata: Metadata = { title: "Rewards" };

export default function RewardsPage() {
  return (
    <main className="section shell">
      <div className="section-head"><div><h2>RightPrice Rewards</h2><p>Confirmed cashback and referral rewards are projected from immutable ledger events.</p></div></div>
      <RewardsClient />
    </main>
  );
}
