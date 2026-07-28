#!/usr/bin/env node
/**
 * One-shot copy of the `User` table from the Supabase (Postgres) database to the
 * self-hosted MariaDB instance.
 *
 * Existing usernames are left untouched, so the script can be run again safely.
 * Requires the dev dependencies (`npm install`) and a reachable MariaDB port.
 *
 * Usage:
 *   SUPABASE_DATABASE_URL="postgresql://user:pass@host:5432/postgres" \
 *   DATABASE_URL="mysql://loto:pass@127.0.0.1:3306/loto" \
 *   npx tsx scripts/migrate-supabase-to-mariadb.ts
 */
import "dotenv/config"
import pg from "pg"
import mariadb from "mariadb"
import { parseDatabaseUrl } from "../lib/db-config"

const sourceUrl = process.env.SUPABASE_DATABASE_URL
if (!sourceUrl) {
  console.error("SUPABASE_DATABASE_URL is not set (Postgres connection string of the Supabase project).")
  process.exit(1)
}

// TLS is driven by the URL itself: append ?sslmode=require for a verified
// connection (what Supabase serves), or ?sslmode=no-verify to accept its pooler
// certificate when verification fails.
const source = new pg.Pool({ connectionString: sourceUrl })

const { poolConfig } = parseDatabaseUrl()
const target = mariadb.createPool({ ...poolConfig, connectionLimit: 1 })

async function main() {
  const { rows } = await source.query(
    `SELECT id, username, password, "isAdmin", "isActive", "createdAt", "updatedAt"
     FROM "User" ORDER BY id`
  )
  console.log(`Read ${rows.length} user(s) from Supabase.`)

  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    const result = await target.query(
      `INSERT IGNORE INTO User (id, username, password, isAdmin, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [row.id, row.username, row.password, row.isAdmin, row.isActive, row.createdAt, row.updatedAt]
    )

    if (result.affectedRows === 1) {
      inserted += 1
    } else {
      skipped += 1
      console.log(`  '${row.username}' already exists, left unchanged.`)
    }
  }

  // Keep AUTO_INCREMENT above the highest imported id.
  await target.query("ALTER TABLE User AUTO_INCREMENT = 1")

  console.log(`Done: ${inserted} inserted, ${skipped} skipped.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await source.end()
    await target.end()
  })
