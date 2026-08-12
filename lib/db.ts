import postgres from "postgres";

/**
 * Shared Postgres (Neon) client. Created lazily and cached for the lifetime
 * of the server process. `sql.end()` is never called — Next.js runs one
 * process per serverless instance, so the connection is reused.
 */
const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

const connectionString = process.env.DATABASE_URL;

export function getSql() {
  if (globalForDb.sql) return globalForDb.sql;
  if (!connectionString) return null;
  globalForDb.sql = postgres(connectionString, {
    ssl: "require",
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  return globalForDb.sql;
}

export const sql = getSql();
