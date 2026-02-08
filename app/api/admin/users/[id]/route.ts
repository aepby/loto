import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

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
