import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

let devKeysStore: Array<{
  id: number;
  prefix: string;
  created_at: string;
  usage_count: number;
}> = [
  {
    id: 1,
    prefix: "wlk_prod",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    usage_count: 1420,
  },
  {
    id: 2,
    prefix: "wlk_stag",
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    usage_count: 310,
  },
];

export function recordKeyUsage(keyOrPrefix?: string | null) {
  if (!keyOrPrefix) return;
  const prefix = keyOrPrefix.substring(0, 8);
  const target = devKeysStore.find((k) => k.prefix === prefix);
  if (target) {
    target.usage_count += 1;
  } else if (devKeysStore.length > 0) {
    // If prefix wasn't specific, attribute to primary key
    devKeysStore[0].usage_count += 1;
  }
}

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

  devKeysStore = [newKeyRecord, ...devKeysStore];

  return NextResponse.json(
    {
      key: rawKey,
      prefix: prefix,
    },
    { status: 201 }
  );
}
