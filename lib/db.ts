// Required for Supabase SSL certificates in serverless environments
if (process.env.NODE_ENV === "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const isSsl =
  process.env.POSTGRES_SSL === "true" ||
  Boolean(process.env.POSTGRES_PRISMA_URL?.includes("sslmode=require"))

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_PRISMA_URL!,
  ssl: isSsl ? { rejectUnauthorized: false } : false,
})

const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
