export interface RevenueGate {
  id: string;
  label: string;
  ready: boolean;
  missing?: string[];
  detail: string;
}

function has(key: string): boolean {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0;
}

function strongSecret(key: string): boolean {
  const value = process.env[key]?.trim() ?? "";
  if (!value || value === "change-me-to-a-long-random-secret") return false;
  return value.length >= 32;
}

function productionAppUrlReady(): boolean {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

export function revenueReadiness(): RevenueGate[] {
  const clickoutReady = strongSecret("RIGHTPRICE_CLICKOUT_SECRET");
  const supabaseReady =
    has("NEXT_PUBLIC_SUPABASE_URL") &&
    has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") &&
    has("SUPABASE_SERVICE_ROLE_KEY");
  const ingestReady = strongSecret("AFFILIATE_INGEST_SECRET");
  const cronReady = strongSecret("CRON_SECRET");
  const appUrlReady = productionAppUrlReady();
  const demoOff = process.env.ENABLE_DEMO_CONNECTOR !== "true";

  return [
    {
      id: "clickout",
      label: "Signed affiliate clickouts",
      ready: clickoutReady,
      missing: clickoutReady ? [] : ["RIGHTPRICE_CLICKOUT_SECRET (strong non-placeholder value)"],
      detail: "Required before commission-tracked outbound links are trusted."
    },
    {
      id: "supabase",
      label: "Supabase reward/account storage",
      ready: supabaseReady,
      missing: [
        ...(!has("NEXT_PUBLIC_SUPABASE_URL") ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
        ...(!has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ? ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] : []),
        ...(!has("SUPABASE_SERVICE_ROLE_KEY") ? ["SUPABASE_SERVICE_ROLE_KEY"] : [])
      ],
      detail: "Required for account attribution, reward ledger, and affiliate transaction persistence."
    },
    {
      id: "ingest",
      label: "Affiliate transaction ingestion",
      ready: ingestReady,
      missing: ingestReady ? [] : ["AFFILIATE_INGEST_SECRET (32+ characters)"],
      detail: "Protects normalized network conversion/commission ingestion."
    },
    {
      id: "cron",
      label: "Scheduled price/alert jobs",
      ready: cronReady,
      missing: cronReady ? [] : ["CRON_SECRET (32+ characters)"],
      detail: "Protects scheduled rechecks and alert processing."
    },
    {
      id: "app-url",
      label: "Canonical production URL",
      ready: appUrlReady,
      missing: appUrlReady ? [] : ["NEXT_PUBLIC_APP_URL (public HTTPS origin, not localhost)"],
      detail: "Used for auth callbacks, affiliate applications, and canonical links."
    },
    {
      id: "demo",
      label: "Demo inventory disabled in production",
      ready: demoOff,
      missing: demoOff ? [] : ["Set ENABLE_DEMO_CONNECTOR=false"],
      detail: "Prevents demo offers from being mistaken for live retailer inventory."
    }
  ];
}

export function revenueReadinessSummary() {
  const gates = revenueReadiness();
  return {
    ready: gates.filter((gate) => gate.ready).length,
    total: gates.length,
    allReady: gates.every((gate) => gate.ready)
  };
}
