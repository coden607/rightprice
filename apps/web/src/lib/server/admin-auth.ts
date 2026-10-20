import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

function allowedEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAllowed(email?: string | null): boolean {
  return Boolean(email && allowedEmails().has(email.toLowerCase()));
}

export async function currentAdminEmail(): Promise<string | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || allowedEmails().size === 0) return undefined;

  const cookieStore = await cookies();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {}
    }
  });
  const { data } = await client.auth.getUser();
  return isAllowed(data.user?.email) ? data.user?.email : undefined;
}

export async function requestIsAdmin(request: NextRequest): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || allowedEmails().size === 0) return false;

  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {}
    }
  });
  const { data } = await client.auth.getUser();
  return isAllowed(data.user?.email);
}
