import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.card.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 })

  await db.card.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
