import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  role: z.enum(["ADMIN", "USER"]).optional(),
  name: z.string().min(2).optional(),
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
  const target = await db.user.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!target) return NextResponse.json({ error: "Integrante não encontrado" }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(parsed.data.role && { role: parsed.data.role }),
      ...(parsed.data.name && { name: parsed.data.name }),
    },
    select: { id: true, name: true, email: true, role: true, avatarColor: true },
  })

  return NextResponse.json({ member: updated })
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

  // Não permitir excluir a si mesmo
  if (id === user.id) {
    return NextResponse.json({ error: "Você não pode remover a si mesmo" }, { status: 400 })
  }

  const target = await db.user.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!target) return NextResponse.json({ error: "Integrante não encontrado" }, { status: 404 })

  // Verifica se é o último admin
  if (target.role === "ADMIN") {
    const adminCount = await db.user.count({
      where: { familyId: user.family.id, role: "ADMIN" },
    })
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Não é possível remover o último administrador da família" },
        { status: 400 }
      )
    }
  }

  // Desvincula lançamentos (define responsável/criador como null) e remove o usuário
  await db.transaction.updateMany({
    where: { responsibleId: id },
    data: { responsibleId: null },
  })
  await db.transaction.updateMany({
    where: { createdById: id },
    data: { createdById: null },
  })
  await db.card.updateMany({
    where: { responsibleId: id },
    data: { responsibleId: null },
  })
  await db.recurringBill.updateMany({
    where: { responsibleId: id },
    data: { responsibleId: null },
  })
  await db.goal.updateMany({
    where: { responsibleId: id },
    data: { responsibleId: null },
  })
  await db.session.deleteMany({ where: { userId: id } })

  await db.user.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
