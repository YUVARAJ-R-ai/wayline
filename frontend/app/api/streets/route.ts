import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bbox = searchParams.get("bbox");
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

  if (backendUrl && !backendUrl.includes("localhost:3000")) {
    try {
      const res = await fetch(
        `${backendUrl}/api/streets${bbox ? `?bbox=${encodeURIComponent(bbox)}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("Backend streets overlay unreachable, returning empty FeatureCollection:", err);
    }
  }

  return NextResponse.json({
    type: "FeatureCollection",
    features: [],
  });
}
