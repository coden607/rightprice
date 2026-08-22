"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function AccountClient() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isConfigured = configured();

  useEffect(() => {
    if (!isConfigured) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [isConfigured]);

  if (!isConfigured) {
    return <div className="panel"><h3>Supabase setup required</h3><p className="muted">The account flow is implemented, but public Supabase environment variables are intentionally absent from this generated repository. Add them after creating the project and applying the migration.</p></div>;
  }

  if (user) {
    return (
      <div className="panel">
        <h3>Signed in</h3>
        <p className="muted">{user.email}</p>
        <button className="secondary-button" onClick={async () => { setBusy(true); await createClient().auth.signOut(); setBusy(false); }} disabled={busy}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: 620 }}>
      <h3>Email magic link</h3>
      <p className="muted">No password required. We’ll send a secure sign-in link.</p>
      <form onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true); setMessage("");
        const origin = window.location.origin;
        const { error } = await createClient().auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${origin}/auth/callback` }
        });
        setMessage(error ? error.message : "Check your email for the secure sign-in link.");
        setBusy(false);
      }}>
        <div className="search-box" style={{ margin: 0 }}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required aria-label="Email" />
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Sending…" : "Email me a link"}</button>
        </div>
      </form>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
