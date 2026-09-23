// Runs automatically before every Vercel build.
// Creates / updates the database tables and, if the videos table is empty,
// loads the films from supabase/seed.sql. Safe to run any number of times:
// it never deletes or overwrites the team's data.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, "..", "supabase", f), "utf8");

const candidates = [
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.POSTGRES_URL,
  process.env.DATABASE_URL,
].filter(Boolean);

if (!candidates.length) {
  console.log("[setup-db] No database connection found yet. Skipping automatic setup.");
  console.log("[setup-db] Connect Supabase in Vercel → Storage, then redeploy.");
  process.exit(0);
}

function clean(raw) {
  // pg can't verify Supabase's certificate chain with sslmode=require; use TLS without verification
  const u = new URL(raw);
  ["sslmode", "supa", "pgbouncer", "connection_limit"].forEach((k) => u.searchParams.delete(k));
  return u.toString();
}

async function connect() {
  let lastErr;
  for (const raw of candidates) {
    const client = new pg.Client({ connectionString: clean(raw), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    try { await client.connect(); return client; }
    catch (e) { lastErr = e; try { await client.end(); } catch {} }
  }
  throw lastErr;
}

try {
  const client = await connect();
  await client.query(read("schema.sql"));
  console.log("[setup-db] Tables, security rules and realtime are ready.");
  const { rows } = await client.query("select count(*)::int as n from public.videos");
  if (rows[0].n === 0) {
    await client.query(read("seed.sql"));
    const after = await client.query("select count(*)::int as n from public.videos");
    console.log(`[setup-db] Loaded ${after.rows[0].n} videos from seed.sql.`);
  } else {
    console.log(`[setup-db] ${rows[0].n} videos already in the database. Seed skipped (your data is untouched).`);
  }
  await client.end();
} catch (e) {
  // Don't block the deployment; the app shows a clear message instead.
  console.warn("[setup-db] Automatic database setup did not complete:", e.message);
  console.warn("[setup-db] Fallback: run supabase/schema.sql then supabase/seed.sql in Supabase → SQL Editor.");
}
