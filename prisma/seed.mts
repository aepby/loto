import "dotenv/config"
// Required for Supabase SSL certificates in serverless environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import bcrypt from "bcryptjs"

const isSsl =
  process.env.POSTGRES_SSL === "true" ||
  Boolean(process.env.POSTGRES_URL_NON_POOLING?.includes("sslmode=require"))

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING!,
  ssl: isSsl ? { rejectUnauthorized: false } : false,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const hashedPassword = await bcrypt.hash("><!ztg@13S", 10)

  await prisma.user.upsert({
    where: { username: "thomas" },
    update: {
      password: hashedPassword,
      isAdmin: true,
      isActive: true,
    },
    create: {
      username: "thomas",
      password: hashedPassword,
      isAdmin: true,
      isActive: true,
    },
  })

  console.log("Admin user 'thomas' seeded successfully.")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
