export type SavedOfferSnapshot = {
  id: string;
  title: string;
  retailerName: string;
  retailerId?: string;
  total: number;
  effective: number;
  currency: string;
  deliveryLabel: string;
  score: number;
  query: string;
  savedAt: string;
};

const SAVED_KEY = "rightprice:saved:v1";
const COMPARE_KEY = "rightprice:compare:v1";
const MAX_COMPARE = 4;

function read(key: string): SavedOfferSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(Boolean) as SavedOfferSnapshot[] : [];
  } catch {
    return [];
  }
}

function write(key: string, value: SavedOfferSnapshot[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("rightprice:shopping-memory"));
}

export function savedOffers(): SavedOfferSnapshot[] {
  return read(SAVED_KEY);
}

export function compareOffers(): SavedOfferSnapshot[] {
  return read(COMPARE_KEY);
}

export function saveOffer(snapshot: SavedOfferSnapshot): SavedOfferSnapshot[] {
  const next = [snapshot, ...savedOffers().filter((item) => item.id !== snapshot.id)].slice(0, 100);
  write(SAVED_KEY, next);
  return next;
}

export function removeSavedOffer(id: string): SavedOfferSnapshot[] {
  const next = savedOffers().filter((item) => item.id !== id);
  write(SAVED_KEY, next);
  return next;
}

export function addCompareOffer(snapshot: SavedOfferSnapshot): { items: SavedOfferSnapshot[]; added: boolean } {
  const current = compareOffers();
  if (current.some((item) => item.id === snapshot.id)) return { items: current, added: false };
  const next = [...current, snapshot].slice(-MAX_COMPARE);
  write(COMPARE_KEY, next);
  return { items: next, added: true };
}

export function removeCompareOffer(id: string): SavedOfferSnapshot[] {
  const next = compareOffers().filter((item) => item.id !== id);
  write(COMPARE_KEY, next);
  return next;
}

export function clearCompareOffers() {
  write(COMPARE_KEY, []);
}

export function encodeCollection(items: SavedOfferSnapshot[]): string {
  const compact = items.slice(0, 30).map(({ title, retailerName, total, effective, currency, query }) => ({
    title,
    retailerName,
    total,
    effective,
    currency,
    query
  }));
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeCollection(value: string): SavedOfferSnapshot[] {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Array<Partial<SavedOfferSnapshot>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 30).flatMap((item, index) => {
      if (!item.title || !item.retailerName || !item.query || typeof item.total !== "number" || typeof item.effective !== "number") return [];
      return [{
        id: `shared:${index}:${item.title}`,
        title: item.title,
        retailerName: item.retailerName,
        total: item.total,
        effective: item.effective,
        currency: item.currency ?? "USD",
        deliveryLabel: "Refresh search for current delivery",
        score: 0,
        query: item.query,
        savedAt: new Date().toISOString()
      }];
    });
  } catch {
    return [];
  }
}
