import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RightPrice — Search once. Buy smarter.", template: "%s | RightPrice" },
  description: "Compare real purchase options by total price, delivery, seller trust, returns, cashback and the criteria that matter to you.",
  applicationName: "RightPrice",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        <nav className="nav">
          <div className="shell nav-inner">
            <Link className="brand" href="/">
              <span className="brand-mark">R</span>
              RightPrice
            </Link>
            <div className="nav-links">
              <Link href="/search">Compare</Link>
              <Link href="/deals">Deals</Link>
              <Link href="/scan">Scan</Link>
              <Link href="/alerts">Alerts</Link>
              <Link href="/rewards">Rewards</Link>
              <Link href="/referrals">Refer & Earn</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/account">Account</Link>
            </div>
          </div>
        </nav>
        {children}
        <footer className="footer">
          <div className="shell footer-inner">
            <span>© {new Date().getFullYear()} RightPrice</span>
            <span>RightPrice may earn compensation from qualifying purchases. Rankings are shopper-first and do not use affiliate commission as a ranking input.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
