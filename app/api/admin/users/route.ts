import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { z } from "zod"

const createUserSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit faire au moins 3 caractères."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
  isAdmin: z.boolean().optional().default(false),
})

async function requireAdmin() {
  const session = await getSession()
  if (!session || !session.isAdmin) {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const result = createUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { username, password, isAdmin } = result.data

    const existing = await prisma.user.findUnique({
      where: { username },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Ce nom d'utilisateur existe déjà." },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        isAdmin,
      },
      select: {
        id: true,
        username: true,
        isAdmin: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    )
  }
}
