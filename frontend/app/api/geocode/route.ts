import { NextRequest, NextResponse } from "next/server";
import { recordKeyUsage } from "@/lib/apiKeyStore";

export const dynamic = "force-dynamic";

const MOCK_LOCATIONS: Record<string, { lat: number; lng: number; address: string }> = {
  london: { lat: 51.5074, lng: -0.1278, address: "London, United Kingdom" },
  paris: { lat: 48.8566, lng: 2.3522, address: "Paris, Île-de-France, France" },
  chennai: { lat: 13.0843, lng: 80.2705, address: "Chennai, Tamil Nadu, India" },
  "new york": { lat: 40.7128, lng: -74.006, address: "New York, NY, USA" },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: 'Missing search query "q".' }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const apiKey = req.headers.get("x-api-key");
  recordKeyUsage(apiKey);

  if (backendUrl && !backendUrl.includes("localhost:3000")) {
    try {
      const res = await fetch(`${backendUrl}/api/geocode?q=${encodeURIComponent(q)}`, {
        headers: { ...(apiKey ? { "x-api-key": apiKey } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("Backend geocode unreachable, trying Nominatim fallback:", err);
    }
  }

  // Fallback to OSM Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WaylineLocalDev/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name,
        });
      }
    }
  } catch (err) {
    console.warn("Nominatim geocode fallback failed:", err);
  }

  // Fallback to mock dictionary
  const qLower = q.toLowerCase();
  for (const [key, loc] of Object.entries(MOCK_LOCATIONS)) {
    if (qLower.includes(key)) {
      return NextResponse.json(loc);
    }
  }

  return NextResponse.json({ error: "Location not found." }, { status: 404 });
}
