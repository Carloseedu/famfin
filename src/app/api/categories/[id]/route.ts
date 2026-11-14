import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  color: z.string().optional(),
  icon: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.category.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const updated = await db.category.update({
    where: { id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.color && { color: parsed.data.color }),
      ...(parsed.data.icon !== undefined && { icon: parsed.data.icon || null }),
    },
  })

  return NextResponse.json({ category: updated })
}

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
  const existing = await db.category.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 })

  // Verifica se há lançamentos vinculados
  const count = await db.transaction.count({ where: { categoryId: id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${count} lançamento(s) vinculado(s)` },
      { status: 400 }
    )
  }

  await db.category.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
