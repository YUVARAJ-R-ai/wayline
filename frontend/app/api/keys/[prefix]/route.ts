import { NextRequest, NextResponse } from "next/server";
import { deleteDevKey } from "@/lib/apiKeyStore";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ prefix: string }> }
) {
  const { prefix } = await params;
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const authHeader = req.headers.get("authorization");

  if (backendUrl && !backendUrl.includes("localhost:3000")) {
    try {
      const res = await fetch(`${backendUrl}/api/keys/${prefix}`, {
        method: "DELETE",
        headers: { ...(authHeader ? { Authorization: authHeader } : {}) },
      });
      if (res.ok) {
        deleteDevKey(prefix);
        return NextResponse.json({ message: "API key deleted successfully." });
      }
    } catch (err) {
      console.warn("Backend keys delete proxy unreachable, deleting locally:", err);
    }
  }

  deleteDevKey(prefix);
  return NextResponse.json({ message: "API key deleted successfully." });
}
