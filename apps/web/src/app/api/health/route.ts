import { NextResponse } from "next/server";
import { configuredConnectors } from "@/lib/server/connectors";

export const dynamic = "force-dynamic";

export async function GET() {
  const connectors = configuredConnectors();
  const health = await Promise.all(connectors.map((connector) => connector.health()));
  const realEnabled = connectors.some((connector) => connector.id !== "mock" && connector.isEnabled());
  return NextResponse.json({
    ok: true,
    status: realEnabled ? "live-connectors-enabled" : "demo-ready",
    connectors: health,
    timestamp: new Date().toISOString()
  });
}
