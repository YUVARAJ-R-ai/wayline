import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing "lat" or "lng" parameters.' },
      { status: 400 }
    );
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const apiKey = req.headers.get("x-api-key");

  if (backendUrl && !backendUrl.includes("localhost:3000")) {
    try {
      const res = await fetch(
        `${backendUrl}/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
        {
          headers: { ...(apiKey ? { "x-api-key": apiKey } : {}) },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("Backend reverse-geocode unreachable, trying Nominatim fallback:", err);
    }
  }

  // Fallback to OSM Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WaylineLocalDev/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return NextResponse.json({ address: data.display_name });
      }
    }
  } catch (err) {
    console.warn("Nominatim reverse-geocode fallback failed:", err);
  }

  return NextResponse.json({
    address: `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
  });
}
