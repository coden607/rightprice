import type { Metadata } from "next";
import { ListsClient } from "@/components/lists-client";
export const metadata: Metadata = { title: "Saved lists" };
export default function ListsPage(){return <main className="section shell"><ListsClient/></main>;}
