import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash("><!ztg@13S", 10)

  await prisma.user.upsert({
    where: { username: "thomas" },
    update: {},
    create: {
      username: "thomas",
      password: hashedPassword,
      isAdmin: true,
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
