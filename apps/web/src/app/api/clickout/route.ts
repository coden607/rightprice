import { NextRequest, NextResponse } from "next/server";
import { verifyClickToken } from "@/lib/server/clickout";
import { recordAffiliateClick } from "@/lib/server/record-click";
import { requestUserId } from "@/lib/server/request-user";
import { checkPublicRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing click token" }, { status: 400 });

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimit = checkPublicRateLimit("clickout", clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const payload = verifyClickToken(token);
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const userId = await requestUserId(request).catch(() => undefined);
    await recordAffiliateClick({
      offerId: payload.offerId,
      retailerId: payload.retailerId,
      referralCode: request.cookies.get("rp_ref")?.value,
      userId,
      attributionRef: payload.attributionRef,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ip: forwarded
    }).catch((error) => console.error("Failed to persist affiliate click", error));

    return NextResponse.redirect(payload.destination, 302);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid click token" }, { status: 400 });
  }
}
