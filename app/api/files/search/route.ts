import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const snapshot = await db
      .collection("files")
      .where("userId", "==", auth.user.uid)
      .limit(500)
      .get();

    const files = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)
      .filter((file) => {
        if (!query) return true;
        const haystack = [
          String(file.name ?? ""),
          String(file.summary ?? ""),
          String(file.text ?? ""),
          Array.isArray(file.keywords) ? file.keywords.join(" ") : "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("[api/files/search] failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
