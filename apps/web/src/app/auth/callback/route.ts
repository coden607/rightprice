import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = new URL("/account", request.url);
  if (!code) {
    destination.searchParams.set("error", "missing_code");
    return NextResponse.redirect(destination);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    destination.searchParams.set("error", "supabase_not_configured");
    return NextResponse.redirect(destination);
  }

  const response = NextResponse.redirect(destination);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    destination.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(destination);
  }

  const referralCode = request.cookies.get("rp_ref")?.value;
  const admin = createAdminClient();
  if (referralCode && admin) {
    const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", referralCode).maybeSingle();
    if (referrer?.id && referrer.id !== data.user.id) {
      await admin.from("referral_edges").upsert({
        referrer_user_id: referrer.id,
        referred_user_id: data.user.id,
        referral_code: referralCode,
        metadata: { source: "signup_callback" }
      }, { onConflict: "referred_user_id", ignoreDuplicates: true });
    }
  }

  return response;
}
