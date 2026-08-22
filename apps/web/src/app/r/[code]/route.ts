import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
  if (!normalized) return NextResponse.redirect(new URL("/", request.url));

  const response = NextResponse.redirect(new URL("/?ref=accepted", request.url));
  response.cookies.set("rp_ref", normalized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });
  return response;
}
