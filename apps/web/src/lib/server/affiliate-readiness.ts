export type AffiliateState =
  | "monetizing"
  | "configured"
  | "pending-approval"
  | "needs-credentials"
  | "not-started"
  | "blocked";

export interface AffiliateProgramReadiness {
  id: string;
  name: string;
  priority: number;
  applyUrl: string;
  partnerStatus: string;
  state: AffiliateState;
  enabled: boolean;
  missing: string[];
  notes?: string;
}

interface ProgramSpec {
  id: string;
  name: string;
  prefix: string;
  priority: number;
  applyUrl: string;
  required: string[];
  approvalEnv?: string;
  notes?: string;
}

const PROGRAMS: ProgramSpec[] = [
  {
    id: "ebay",
    name: "eBay Partner Network",
    prefix: "EBAY",
    priority: 1,
    applyUrl: "https://ebaypartnernetwork.ebay.com/",
    required: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_CAMPAIGN_ID"],
    notes: "Direct Browse API connector is already implemented."
  },
  {
    id: "impact",
    name: "impact.com",
    prefix: "IMPACT",
    priority: 2,
    applyUrl: "https://impact.com/get-started/",
    required: ["IMPACT_FEED_URL"]
  },
  {
    id: "awin",
    name: "Awin",
    prefix: "AWIN",
    priority: 3,
    applyUrl: "https://ui.awin.com/publisher-signup",
    required: ["AWIN_FEED_URL"],
    notes: "Awin feed column preset is already implemented."
  },
  {
    id: "cj",
    name: "CJ Affiliate",
    prefix: "CJ",
    priority: 4,
    applyUrl: "https://www.cj.com/join",
    required: ["CJ_FEED_URL"]
  },
  {
    id: "walmart",
    name: "Walmart",
    prefix: "WALMART",
    priority: 5,
    applyUrl: "https://affiliates.walmart.com/",
    required: ["WALMART_FEED_URL"]
  },
  {
    id: "temu",
    name: "Temu",
    prefix: "TEMU",
    priority: 6,
    applyUrl: "https://www.temu.com/affiliate_recruit.html",
    required: ["TEMU_FEED_URL"]
  },
  {
    id: "partnerize",
    name: "Partnerize",
    prefix: "PARTNERIZE",
    priority: 7,
    applyUrl: "https://partnerize.com/partners",
    required: ["PARTNERIZE_FEED_URL"]
  },
  {
    id: "rakuten",
    name: "Rakuten Advertising",
    prefix: "RAKUTEN",
    priority: 8,
    applyUrl: "https://rakutenadvertising.com/",
    required: ["RAKUTEN_FEED_URL"]
  },
  {
    id: "amazon",
    name: "Amazon Associates",
    prefix: "AMAZON",
    priority: 9,
    applyUrl: "https://affiliate-program.amazon.com/",
    required: ["AMAZON_FEED_URL", "AMAZON_COMPARISON_APPROVED"],
    approvalEnv: "AMAZON_COMPARISON_APPROVED",
    notes: "Comparison use stays blocked until explicitly approved."
  },
  {
    id: "aliexpress",
    name: "AliExpress",
    prefix: "ALIEXPRESS",
    priority: 10,
    applyUrl: "https://portals.aliexpress.com/",
    required: ["ALIEXPRESS_FEED_URL"]
  },
  {
    id: "bestbuy",
    name: "Best Buy",
    prefix: "BESTBUY",
    priority: 11,
    applyUrl: "https://www.bestbuy.com/site/partnerships/affiliate-program/pcmcat198500050002.c",
    required: ["BESTBUY_FEED_URL"]
  },
  {
    id: "target",
    name: "Target",
    prefix: "TARGET",
    priority: 12,
    applyUrl: "https://partners.target.com/",
    required: ["TARGET_FEED_URL"]
  },
  {
    id: "newegg",
    name: "Newegg",
    prefix: "NEWEGG",
    priority: 13,
    applyUrl: "https://www.newegg.com/promotions/affiliate",
    required: ["NEWEGG_FEED_URL"]
  },
  {
    id: "homedepot",
    name: "The Home Depot",
    prefix: "HOMEDEPOT",
    priority: 14,
    applyUrl: "https://www.homedepot.com/c/SF_MS_The_Home_Depot_Affiliate_Program",
    required: ["HOMEDEPOT_FEED_URL"]
  },
  {
    id: "lowes",
    name: "Lowe's",
    prefix: "LOWES",
    priority: 15,
    applyUrl: "https://www.lowes.com/l/about/affiliate-program",
    required: ["LOWES_FEED_URL"]
  },
  {
    id: "etsy",
    name: "Etsy",
    prefix: "ETSY",
    priority: 16,
    applyUrl: "https://www.etsy.com/affiliates",
    required: ["ETSY_FEED_URL"]
  },
  {
    id: "wish",
    name: "Wish",
    prefix: "WISH",
    priority: 17,
    applyUrl: "https://www.wish.com/",
    required: ["WISH_FEED_URL"]
  }
];

function exists(key: string): boolean {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0 && value !== "false";
}

function status(prefix: string): string {
  return process.env[`${prefix}_PARTNER_STATUS`] ?? "unknown";
}

function enabledFor(spec: ProgramSpec): boolean {
  if (spec.id === "ebay") return process.env.ENABLE_EBAY_CONNECTOR === "true";
  return process.env[`${spec.prefix}_ENABLED`] === "true";
}

function stateFor(spec: ProgramSpec, missing: string[], enabled: boolean, partnerStatus: string): AffiliateState {
  if (spec.approvalEnv && process.env[spec.approvalEnv] !== "true") return "blocked";
  if (/rejected|suspended|disabled|closed|denied/i.test(partnerStatus)) return "blocked";
  if (/pending|review|submitted/i.test(partnerStatus)) return "pending-approval";
  if (missing.length > 0) return "needs-credentials";
  if (!/approved|active/i.test(partnerStatus)) return "configured";
  if (enabled) return "monetizing";
  return "configured";
}

export function affiliateReadiness(): AffiliateProgramReadiness[] {
  return PROGRAMS.map((spec) => {
    const missing = spec.required.filter((key) => !exists(key));
    const partnerStatus = status(spec.prefix);
    const enabled = enabledFor(spec);
    return {
      id: spec.id,
      name: spec.name,
      priority: spec.priority,
      applyUrl: spec.applyUrl,
      partnerStatus,
      state: stateFor(spec, missing, enabled, partnerStatus),
      enabled,
      missing,
      notes: spec.notes
    };
  }).sort((a, b) => a.priority - b.priority);
}

export function affiliateReadinessSummary() {
  const programs = affiliateReadiness();
  return {
    monetizing: programs.filter((p) => p.state === "monetizing").length,
    configured: programs.filter((p) => p.state === "configured").length,
    pendingApproval: programs.filter((p) => p.state === "pending-approval").length,
    needsCredentials: programs.filter((p) => p.state === "needs-credentials").length,
    blocked: programs.filter((p) => p.state === "blocked").length,
    total: programs.length
  };
}
