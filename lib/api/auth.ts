import { NextResponse } from "next/server";

import { extractBearerToken, verifyIdToken } from "@/lib/firebase/verify";

export interface AuthResult {
  user: { uid: string; email?: string | null; name?: string | null };
  token: string;
}

/**
 * Verifies the bearer token on a request. Returns the verified user, or a
 * `NextResponse` error response to return immediately.
 */
export async function requireAuth(
  request: Request
): Promise<{ user: AuthResult["user"]; token: string } | { error: Response }> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token || !projectId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const verified = await verifyIdToken(token, projectId);
    return {
      user: {
        uid: verified.uid,
        email: verified.email ?? null,
        name: verified.name ?? null,
      },
      token,
    };
  } catch (error) {
    console.warn("[api] token verification failed:", error);
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}
