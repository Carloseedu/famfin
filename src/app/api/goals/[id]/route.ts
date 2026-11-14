import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  color: z.string().optional(),
  archived: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const existing = await db.goal.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  const data = parsed.data

  const updated = await db.goal.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
      ...(data.currentAmount !== undefined && { currentAmount: data.currentAmount }),
      ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.color && { color: data.color }),
      ...(data.archived !== undefined && { archived: data.archived }),
    },
  })

  return NextResponse.json({ goal: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const existing = await db.goal.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 })

  await db.goal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
