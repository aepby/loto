import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { z } from "zod"

const patchPasswordSchema = z.object({
  newPassword: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id, 10)

  if (isNaN(userId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  try {
    const body = await request.json()
    const result = patchPasswordSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(result.data.newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id, 10)

  if (isNaN(userId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  try {
    const { isActive } = await request.json()
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Valeur invalide." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 })
    }
    if (user.isAdmin) {
      return NextResponse.json({ error: "Impossible de désactiver un administrateur." }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id, 10)

  if (isNaN(userId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  if (userId === session.userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 400 }
    )
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Utilisateur non trouvé." },
      { status: 404 }
    )
  }
}
