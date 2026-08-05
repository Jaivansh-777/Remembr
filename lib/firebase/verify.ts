import { createPublicKey, createVerify } from "crypto";

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache: { keys: Record<string, string>; expiresAt: number } | null = null;

export interface VerifiedUser {
  uid: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}

function base64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function getCertKeys(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) {
    return certCache.keys;
  }
  const response = await fetch(CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch signing keys (${response.status})`);
  }
  const keys = (await response.json()) as Record<string, string>;
  const maxAge =
    Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1]) ||
    3600;
  certCache = { keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

/**
 * Verifies a Firebase ID token using Google's public signing keys.
 * Works without a service account (no firebase-admin credentials needed).
 */
export async function verifyIdToken(
  token: string,
  projectId: string
): Promise<VerifiedUser> {
  if (!projectId) {
    throw new Error("Missing Firebase project ID");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token");
  }
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = JSON.parse(base64urlDecode(headerPart)) as { kid?: string };
  const payload = JSON.parse(base64urlDecode(payloadPart)) as {
    aud?: string;
    iss?: string;
    exp?: number;
    user_id?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  const keys = await getCertKeys();
  const certPem = header.kid ? keys[header.kid] : undefined;
  if (!certPem) {
    throw new Error("Unknown signing key");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  const signature = Buffer.from(signaturePart, "base64url");
  if (!verifier.verify(createPublicKey(certPem), signature)) {
    throw new Error("Invalid token signature");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new Error("Token expired");
  }
  if (payload.aud !== projectId) {
    throw new Error("Invalid audience");
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Invalid issuer");
  }
  if (!payload.user_id) {
    throw new Error("Token has no user id");
  }

  return {
    uid: payload.user_id,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  return match ? match[1] : null;
}
