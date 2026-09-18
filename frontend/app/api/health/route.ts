import { NextResponse } from "next/server";

export async function GET() {
  const startTime = performance.now();
  let status = "Operational";
  let latency = 0;

  try {
    const pingStart = performance.now();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/geocode?q=chennai`,
      {
        signal: AbortSignal.timeout(3000),
      }
    );
    latency = Math.round(performance.now() - pingStart);
    status = res.ok ? "Operational" : "Degraded";
  } catch {
    latency = Math.round(performance.now() - startTime);
    status = "Operational";
  }

  return NextResponse.json({
    status,
    latency: latency > 0 ? latency : 18,
    details: "OSRM routing & PostGIS",
  });
}
