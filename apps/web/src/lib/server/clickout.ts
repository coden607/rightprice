import "server-only";
import crypto from "node:crypto";

interface ClickPayload {
  offerId: string;
  retailerId: string;
  destination: string;
  attributionRef?: string;
  issuedAt: number;
  expiresAt: number;
}

function secret(): string {
  const value = process.env.RIGHTPRICE_CLICKOUT_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("RIGHTPRICE_CLICKOUT_SECRET must be configured in production");
  }
  return "rightprice-development-only-secret-change-before-production";
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload: string): string {
  return crypto.createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

export function createClickToken(input: Omit<ClickPayload, "issuedAt" | "expiresAt">, ttlSeconds = 1800): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ClickPayload = { ...input, issuedAt: now, expiresAt: now + ttlSeconds };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyClickToken(token: string): ClickPayload {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw new Error("Malformed click token");
  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("Invalid click token signature");
  }
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ClickPayload;
  if (!payload.offerId || !payload.retailerId || !payload.destination) throw new Error("Invalid click token payload");
  if (payload.expiresAt < Math.floor(Date.now() / 1000)) throw new Error("Click token expired");
  const destination = new URL(payload.destination);
  if (!/^https?:$/.test(destination.protocol)) throw new Error("Unsafe destination protocol");
  return payload;
}
