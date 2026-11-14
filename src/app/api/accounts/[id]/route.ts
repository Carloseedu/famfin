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
  const existing = await db.account.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  const count = await db.transaction.count({ where: { accountId: id } })
  if (count > 0) {
    return NextResponse.json({ error: `Conta tem ${count} lançamento(s) vinculado(s)` }, { status: 400 })
  }

  await db.account.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
