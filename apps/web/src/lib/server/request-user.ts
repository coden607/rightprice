import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export async function requestUserId(request: NextRequest): Promise<string | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return undefined;
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {
        // Click attribution must never fail merely because a session refresh cookie
        // cannot be persisted during an outbound redirect. Account pages refresh normally.
      }
    }
  });
  const { data } = await client.auth.getUser();
  return data.user?.id;
}
