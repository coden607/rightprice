import { NextResponse } from "next/server";
import { affiliateReadiness, affiliateReadinessSummary } from "@/lib/server/affiliate-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    summary: affiliateReadinessSummary(),
    programs: affiliateReadiness(),
    timestamp: new Date().toISOString()
  });
}
