import { NextResponse } from "next/server";

import { requireAuth, type AuthResult } from "@/lib/api/auth";

export function isAdminUid(uid: string | undefined | null): boolean {
  return Boolean(process.env.ADMIN_UID && uid === process.env.ADMIN_UID);
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_UID);
}

export type AdminAuthResult =
  | { user: AuthResult["user"]; token: string }
  | { error: Response };

/**
 * Authenticates the request AND enforces the admin-only guard. Returns a
 * 401 when unauthenticated, 403 for non-admins, 503 when `ADMIN_UID` is not
 * configured on the server.
 */
export async function requireAdmin(
  request: Request
): Promise<AdminAuthResult> {
  if (!isAdminConfigured()) {
    return {
      error: NextResponse.json(
        { error: "Admin not configured on this server" },
        { status: 503 }
      ),
    };
  }
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;
  if (!isAdminUid(auth.user.uid)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return auth;
}
