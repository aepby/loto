import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { signToken } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { cookies } from "next/headers"

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Nom d'utilisateur et mot de passe requis." },
        { status: 400 }
      )
    }

    const { username, password } = result.data

    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 401 }
      )
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    })

    const cookieStore = await cookies()
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    )
  }
}
