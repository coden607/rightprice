import type { Metadata } from "next";
import { CollectionClient } from "@/components/collection-client";
export const metadata: Metadata = { title: "Shared collection", robots: { index:false, follow:true } };
export default async function CollectionPage({searchParams}:{searchParams:Promise<{items?:string}>}){const {items=""}=await searchParams;return <main className="section shell"><div className="section-head"><div><h2>Shared RightPrice collection</h2><p>Refresh every item to see the current best options.</p></div></div><CollectionClient encoded={items}/></main>;}
