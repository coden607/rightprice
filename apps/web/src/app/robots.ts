import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { const base=process.env.NEXT_PUBLIC_APP_URL ?? "https://rightprice.app"; return { rules:[{userAgent:"*",allow:"/",disallow:["/admin","/account","/rewards","/referrals","/api/"]}], sitemap:`${base}/sitemap.xml` }; }
