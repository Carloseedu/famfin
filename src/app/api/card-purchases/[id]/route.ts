import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

// DELETE remove a compra parcelada E todos os lançamentos vinculados
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
  const existing = await db.cardPurchase.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) return NextResponse.json({ error: "Compra não encontrada" }, { status: 404 })

  // Exclui os lançamentos das parcelas vinculadas
  await db.transaction.deleteMany({
    where: {
      familyId: user.family.id,
      cardId: existing.cardId,
      description: { contains: existing.description },
    },
  })

  await db.cardPurchase.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
