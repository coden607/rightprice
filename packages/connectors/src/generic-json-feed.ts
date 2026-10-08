import { gunzipSync } from "node:zlib";
import {
  calculateOfferTotals,
  money,
  normalizeTitle,
  type CommerceConnector,
  type ConnectorHealth,
  type Offer,
  type SearchContext,
  type SearchIntent
} from "@rightprice/core";

export interface GenericJsonFeedFieldMap {
  id: string;
  title: string;
  price: string;
  shipping?: string;
  cashback?: string;
  url: string;
  affiliateUrl?: string;
  imageUrl?: string;
  brand?: string;
  upc?: string;
  seller?: string;
  retailerId?: string;
  retailerName?: string;
}

export type GenericFeedFormat = "auto" | "json" | "jsonl" | "csv" | "tsv";

export interface GenericJsonFeedConfig {
  id: string;
  displayName: string;
  endpoint?: string;
  enabled?: boolean;
  fields: GenericJsonFeedFieldMap;
  maxItems?: number;
  allowsCashback?: boolean;
  headers?: Record<string, string | undefined>;
  queryParam?: string;
  format?: GenericFeedFormat;
}

type FeedRow = Record<string, unknown>;

function get(row: FeedRow, key?: string): unknown {
  if (!key) return undefined;
  return key.split(".").reduce<unknown>((value, part) => {
    if (value && typeof value === "object" && part in value) return (value as FeedRow)[part];
    return undefined;
  }, row);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function safeConfiguredUrl(value?: string): URL | null {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Generic feed endpoint must use HTTPS");
  return url;
}

function requestHeaders(headers?: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

function safeRetailerId(value: string): string {
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized || "merchant";
}

function parseJsonRows(value: unknown): FeedRow[] {
  if (Array.isArray(value)) return value.filter((row): row is FeedRow => Boolean(row && typeof row === "object"));
  if (value && typeof value === "object") {
    const body = value as FeedRow;
    const possible = body.items ?? body.products ?? body.offers ?? body.results;
    if (Array.isArray(possible)) {
      return possible.filter((row): row is FeedRow => Boolean(row && typeof row === "object"));
    }
  }
  throw new Error("Feed did not return an array/items/products/offers/results collection");
}

function parseDelimitedRecords(text: string, delimiter: "," | "\t"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"") {
        if (text[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export function parseDelimitedFeed(text: string, delimiter: "," | "\t"): FeedRow[] {
  const records = parseDelimitedRecords(text.replace(/^\uFEFF/, ""), delimiter);
  if (records.length < 2) return [];
  const headers = records[0].map((header) => header.trim());
  return records.slice(1).map((record) => Object.fromEntries(
    headers.map((header, index) => [header, record[index] ?? ""])
  ));
}

export function parseFeedText(
  text: string,
  configuredFormat: GenericFeedFormat = "auto",
  sourceUrl = ""
): FeedRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const path = sourceUrl.toLowerCase();
  const format = configuredFormat === "auto"
    ? path.endsWith(".jsonl") || path.endsWith(".ndjson")
      ? "jsonl"
      : path.endsWith(".csv")
        ? "csv"
        : path.endsWith(".tsv") || path.endsWith(".tab")
          ? "tsv"
          : "auto"
    : configuredFormat;

  if (format === "json") return parseJsonRows(JSON.parse(trimmed));
  if (format === "jsonl") {
    return trimmed.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as FeedRow);
  }
  if (format === "csv") return parseDelimitedFeed(trimmed, ",");
  if (format === "tsv") return parseDelimitedFeed(trimmed, "\t");

  try {
    return parseJsonRows(JSON.parse(trimmed));
  } catch {
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    if (lines.length > 1) {
      try {
        return lines.map((line) => JSON.parse(line) as FeedRow);
      } catch {
        const first = lines[0] ?? "";
        const tabs = (first.match(/\t/g) ?? []).length;
        const commas = (first.match(/,/g) ?? []).length;
        return parseDelimitedFeed(trimmed, tabs > commas ? "\t" : ",");
      }
    }
    throw new Error("Unsupported affiliate feed format");
  }
}

async function responseText(response: Response): Promise<string> {
  const buffer = Buffer.from(await response.arrayBuffer());
  const body = buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b
    ? gunzipSync(buffer)
    : buffer;
  return body.toString("utf8");
}

export class GenericJsonFeedConnector implements CommerceConnector {
  readonly id: string;
  readonly displayName: string;

  constructor(private readonly config: GenericJsonFeedConfig) {
    this.id = config.id;
    this.displayName = config.displayName;
  }

  isEnabled(): boolean {
    return Boolean(this.config.enabled && this.config.endpoint);
  }

  private async rows(query?: string): Promise<FeedRow[]> {
    const endpoint = safeConfiguredUrl(this.config.endpoint);
    if (!endpoint) return [];
    if (query && this.config.queryParam) endpoint.searchParams.set(this.config.queryParam, query);
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json,text/csv,text/tab-separated-values,text/plain,*/*", ...requestHeaders(this.config.headers) },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`${this.displayName} feed failed (${response.status})`);
    const text = await responseText(response);
    return parseFeedText(text, this.config.format ?? "auto", endpoint.pathname);
  }

  async search(intent: SearchIntent, _context: SearchContext): Promise<Offer[]> {
    if (!this.isEnabled()) return [];
    const tokens = normalizeTitle(intent.query).split(" ").filter(Boolean);
    const rows = await this.rows(intent.query);
    const fields = this.config.fields;
    const now = new Date().toISOString();

    return rows.slice(0, this.config.maxItems ?? 1000).flatMap((row): Offer[] => {
      const externalId = asString(get(row, fields.id));
      const title = asString(get(row, fields.title));
      const sourceUrl = asString(get(row, fields.url));
      const price = asNumber(get(row, fields.price), Number.NaN);
      if (!externalId || !title || !sourceUrl || !Number.isFinite(price) || price < 0) return [];
      const normalizedTitle = normalizeTitle(title);
      if (!this.config.queryParam && tokens.length && !tokens.every((token) => normalizedTitle.includes(token))) return [];
      const itemPrice = money(price);
      const shipping = money(Math.max(0, asNumber(get(row, fields.shipping), 0)));
      const cashback = money(this.config.allowsCashback ? Math.max(0, asNumber(get(row, fields.cashback), 0)) : 0);
      const totals = calculateOfferTotals({ itemPrice, shipping, cashback });
      if (intent.maxPrice != null && totals.totalBeforeCashback.amount > intent.maxPrice) return [];
      if (intent.condition && intent.condition !== "new") return [];
      if (intent.localPickup) return [];
      const upc = asString(get(row, fields.upc));
      const affiliateUrl = asString(get(row, fields.affiliateUrl));
      const brand = asString(get(row, fields.brand));
      const rowRetailerName = asString(get(row, fields.retailerName));
      const rowRetailerId = asString(get(row, fields.retailerId));
      const retailerName = rowRetailerName ?? this.displayName;
      const retailerId = rowRetailerId ? safeRetailerId(rowRetailerId) : this.id;

      return [{
        id: `${this.id}:${externalId}`,
        product: {
          id: `${this.id}-product:${externalId}`,
          title,
          normalizedTitle,
          brand,
          identifiers: upc ? [{ type: "upc", value: upc }] : [],
          imageUrl: asString(get(row, fields.imageUrl))
        },
        retailerId,
        retailerName,
        seller: asString(get(row, fields.seller)) ? { name: asString(get(row, fields.seller))! } : undefined,
        condition: "new",
        itemPrice,
        shipping,
        cashback: cashback.amount > 0 ? cashback : undefined,
        ...totals,
        sourceUrl,
        affiliateUrl,
        sourceTimestamp: now,
        freshnessSeconds: 1800,
        riskFlags: [],
        metadata: { source: "generic-affiliate-feed", connectorId: this.id }
      }];
    });
  }

  async health(): Promise<ConnectorHealth> {
    if (!this.isEnabled()) return { connectorId: this.id, ok: false, message: "Disabled or endpoint missing", checkedAt: new Date().toISOString() };
    try {
      const rows = await this.rows();
      return { connectorId: this.id, ok: true, message: `Feed reachable (${rows.length} rows)`, checkedAt: new Date().toISOString() };
    } catch (error) {
      return { connectorId: this.id, ok: false, message: error instanceof Error ? error.message : "Feed error", checkedAt: new Date().toISOString() };
    }
  }
}
