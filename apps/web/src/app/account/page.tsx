import type { Metadata } from "next";
import { AccountClient } from "@/components/account-client";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <main className="section shell">
      <div className="section-head">
        <div>
          <h2>Your RightPrice account</h2>
          <p>Sign in to save searches, receive eligible cashback, create alerts and use referral rewards.</p>
        </div>
      </div>
      <AccountClient />
    </main>
  );
}
