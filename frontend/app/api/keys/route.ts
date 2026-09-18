import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { devKeysStore, addDevKey } from "@/lib/apiKeyStore";

export async function GET(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const authHeader = req.headers.get("authorization");

  if (backendUrl && !backendUrl.includes("localhost:3000")) {
    try {
      const res = await fetch(`${backendUrl}/api/keys`, {
        headers: { ...(authHeader ? { Authorization: authHeader } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("Backend keys proxy unreachable, falling back to local dev store:", err);
    }
  }

  return NextResponse.json(devKeysStore);
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const authHeader = req.headers.get("authorization");

  if (backendUrl && !backendUrl.includes("localhost:3000")) {
    try {
      const res = await fetch(`${backendUrl}/api/keys`, {
        method: "POST",
        headers: { ...(authHeader ? { Authorization: authHeader } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 201 });
      }
    } catch (err) {
      console.warn("Backend keys proxy unreachable, generating key locally:", err);
    }
  }

  const rawKey = "wlk_" + crypto.randomUUID().replace(/-/g, "");
  const prefix = rawKey.substring(0, 8);

  const newKeyRecord = {
    id: Date.now(),
    prefix,
    created_at: new Date().toISOString(),
    usage_count: 0,
  };

  addDevKey(newKeyRecord);

  return NextResponse.json(
    {
      key: rawKey,
      prefix: prefix,
    },
    { status: 201 }
  );
}
