/**
 * Seed script — idempotently creates the default users documented in replit.md.
 * Safe to run multiple times; existing rows are left unchanged (ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   npm run seed --workspace=@workspace/scripts
 */

import bcryptjs from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const USERS: Array<{ username: string; password: string; role: "admin" | "user" }> = [
  { username: "admin",   password: "admin123", role: "admin" },
  { username: "usuario", password: "user123",  role: "user"  },
];

async function seed() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    for (const u of USERS) {
      const hash = await bcryptjs.hash(u.password, 10);
      await pool.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (username) DO NOTHING`,
        [u.username, hash, u.role],
      );
      console.log(`[seed] user "${u.username}" (${u.role}) — ok`);
    }
    console.log("[seed] done");
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
