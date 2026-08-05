import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function parseServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

let cachedApp: App | null = null;

export function getAdminApp(): App | null {
  if (getApps().length > 0) return getApps()[0];
  if (cachedApp) return cachedApp;
  try {
    const serviceAccount = parseServiceAccount();
    if (serviceAccount && serviceAccount.project_id) {
      cachedApp = initializeApp({
        credential: cert(serviceAccount as never),
        projectId: serviceAccount.project_id,
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      cachedApp = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
    } else {
      return null;
    }
    return cachedApp;
  } catch (error) {
    console.error("[firebase-admin] initialization failed:", error);
    return null;
  }
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PROJECT_ID
  );
}
