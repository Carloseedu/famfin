import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

// DELETE /api/admin/invite-codes/[id] â revoga/exclui um cÃ³digo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "NÃ£o autenticado" }, { status: 401 })
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const { id } = await params

  const existing = await db.inviteCode.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "CÃ³digo nÃ£o encontrado" }, { status: 404 })
  }

  await db.inviteCode.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
