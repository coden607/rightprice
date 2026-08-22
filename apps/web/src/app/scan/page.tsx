import type { Metadata } from "next";
import { BarcodeScanner } from "@/components/barcode-scanner";

export const metadata: Metadata = { title: "Scan a barcode" };

export default function ScanPage() {
  return <main className="section shell"><div className="section-head"><div><h2>Scan a barcode</h2><p>Use a UPC/EAN from a physical product to jump straight into price comparison.</p></div></div><BarcodeScanner /></main>;
}
