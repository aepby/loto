import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Only read by CLI commands that reach the database (migrate, db push, studio);
    // `prisma generate` must keep working without it, hence the empty fallback.
    url: process.env.DATABASE_URL ?? "",
  },
})
