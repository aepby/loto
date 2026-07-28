import "dotenv/config"
import bcrypt from "bcryptjs"
import { prisma } from "../lib/db"

const DEFAULT_ADMIN_USERNAME = "thomas"

/**
 * Creates the initial administrator account from ADMIN_USERNAME / ADMIN_PASSWORD.
 *
 * The seed runs on every container start, so it never touches an account that
 * already exists: a password changed from the admin panel is not reverted.
 */
async function main() {
  const username = process.env.ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    console.warn("ADMIN_PASSWORD is not set, skipping admin seeding.")
    return
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    console.log(`Admin user '${username}' already exists, left unchanged.`)
    return
  }

  await prisma.user.create({
    data: {
      username,
      password: await bcrypt.hash(password, 10),
      isAdmin: true,
    },
  })

  console.log(`Admin user '${username}' seeded successfully.`)
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
