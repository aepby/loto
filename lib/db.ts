import { PrismaClient } from "@prisma/client"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { parseDatabaseUrl } from "./db-config"

const { poolConfig, database } = parseDatabaseUrl()

// The pool is only opened on the first query, so importing this module during the
// Next.js build does not require a reachable database.
const adapter = new PrismaMariaDb(poolConfig, { database })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
