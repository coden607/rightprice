import { NextRequest, NextResponse } from "next/server";
import { affiliateReadiness, affiliateReadinessSummary } from "@/lib/server/affiliate-readiness";
import { requestIsAdmin } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requestIsAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    summary: affiliateReadinessSummary(),
    programs: affiliateReadiness(),
    timestamp: new Date().toISOString()
  });
}
