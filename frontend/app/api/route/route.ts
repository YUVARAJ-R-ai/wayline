import { NextRequest, NextResponse } from "next/server";
import { recordKeyUsage } from "../keys/route";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing "from" or "to" query parameters.' },
      { status: 400 }
    );
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const apiKey = req.headers.get("x-api-key");
  recordKeyUsage(apiKey);

  // 1. Try backend proxy if available and not circular
  if (backendUrl && !backendUrl.includes("localhost:3000")) {
    try {
      const res = await fetch(
        `${backendUrl}/api/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        {
          headers: { ...(apiKey ? { "x-api-key": apiKey } : {}) },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("Backend routing unreachable, trying public routing fallback:", err);
    }
  }

  // 2. Fallback to public OSRM demo server for interactive testing
  try {
    const osrmPublicUrl = `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`;
    const osrmRes = await fetch(osrmPublicUrl, {
      headers: { "User-Agent": "WaylineLocalDev/1.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (osrmRes.ok) {
      const data = await osrmRes.json();
      if (data && data.routes && data.routes[0]) {
        return NextResponse.json(data.routes[0].geometry);
      }
    }
  } catch (err) {
    console.warn("Public OSRM fallback failed, generating direct path:", err);
  }

  // 3. Fallback to straight-line interpolation if offline
  const [fromLon, fromLat] = from.split(",").map(Number);
  const [toLon, toLat] = to.split(",").map(Number);

  if (!isNaN(fromLon) && !isNaN(fromLat) && !isNaN(toLon) && !isNaN(toLat)) {
    const steps = 10;
    const coords: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      coords.push([
        fromLon + (toLon - fromLon) * ratio,
        fromLat + (toLat - fromLat) * ratio,
      ]);
    }
    return NextResponse.json({
      type: "LineString",
      coordinates: coords,
    });
  }

  return NextResponse.json(
    { error: "Could not calculate route." },
    { status: 500 }
  );
}
