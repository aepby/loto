import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.mts",
  },
  datasource: {
    // Direct connection (no pooling) required for schema operations
    url: process.env["POSTGRES_URL_NON_POOLING"],
  },
})
