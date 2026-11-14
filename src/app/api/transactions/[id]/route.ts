import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  transactionDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  responsibleId: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "DEBIT", "CREDIT", "TRANSFER", "PIX"]).optional().nullable(),
  accountId: z.string().optional().nullable(),
  cardId: z.string().optional().nullable(),
  status: z.enum(["PAID", "PENDING"]).optional(),
  isFixed: z.boolean().optional(),
  isVariable: z.boolean().optional(),
  recurrence: z.enum(["NONE", "MONTHLY", "WEEKLY", "YEARLY"]).optional().nullable(),
  installments: z.number().int().min(1).optional(),
  notes: z.string().optional().nullable(),
  paidDate: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const existing = await db.transaction.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
  }

  if (user.role !== "ADMIN" && existing.createdById !== user.id) {
    return NextResponse.json(
      { error: "Você só pode editar seus próprios lançamentos" },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 }
      )
    }
    const data = parsed.data

    const updateData: any = {}
    if (data.type !== undefined) updateData.type = data.type
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.transactionDate !== undefined) updateData.transactionDate = new Date(data.transactionDate)
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null
    if (data.responsibleId !== undefined) updateData.responsibleId = data.responsibleId || null
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod || null
    if (data.accountId !== undefined) updateData.accountId = data.accountId || null
    if (data.cardId !== undefined) updateData.cardId = data.cardId || null
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === "PAID" && !existing.paidDate) {
        updateData.paidDate = data.paidDate ? new Date(data.paidDate) : new Date()
      } else if (data.status === "PENDING") {
        updateData.paidDate = null
      } else if (data.paidDate !== undefined) {
        updateData.paidDate = data.paidDate ? new Date(data.paidDate) : null
      }
    } else if (data.paidDate !== undefined) {
      updateData.paidDate = data.paidDate ? new Date(data.paidDate) : null
    }
    if (data.isFixed !== undefined) updateData.isFixed = data.isFixed
    if (data.isVariable !== undefined) updateData.isVariable = data.isVariable
    if (data.recurrence !== undefined) updateData.recurrence = data.recurrence || null
    if (data.installments !== undefined) updateData.installments = data.installments
    if (data.notes !== undefined) updateData.notes = data.notes || null

    const updated = await db.transaction.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        account: true,
        card: true,
        responsible: { select: { id: true, name: true, avatarColor: true } },
      },
    })

    await db.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "Transaction",
        entityId: id,
        summary: `Lançamento atualizado: ${existing.description}`,
        familyId: user.family.id,
        userId: user.id,
      },
    })

    return NextResponse.json({ transaction: updated })
  } catch (err: any) {
    console.error("Update transaction error:", err)
    return NextResponse.json({ error: "Erro ao atualizar lançamento" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const existing = await db.transaction.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
  }

  if (user.role !== "ADMIN" && existing.createdById !== user.id) {
    return NextResponse.json(
      { error: "Você só pode excluir seus próprios lançamentos" },
      { status: 403 }
    )
  }

  await db.transaction.delete({ where: { id } })

  await db.auditLog.create({
    data: {
      action: "DELETE",
      entity: "Transaction",
      entityId: id,
      summary: `Lançamento excluído: ${existing.description}`,
      familyId: user.family.id,
      userId: user.id,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  if (action !== "duplicate") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  }

  const existing = await db.transaction.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
  }

  const duplicated = await db.transaction.create({
    data: {
      type: existing.type,
      description: `${existing.description} (cópia)`,
      amount: existing.amount,
      transactionDate: new Date(),
      dueDate: null,
      paidDate: null,
      paymentMethod: existing.paymentMethod,
      status: "PENDING",
      isFixed: existing.isFixed,
      isVariable: existing.isVariable,
      recurrence: existing.recurrence,
      installments: existing.installments,
      notes: existing.notes,
      categoryId: existing.categoryId,
      responsibleId: existing.responsibleId,
      accountId: existing.accountId,
      cardId: existing.cardId,
      createdById: user.id,
      familyId: user.family.id,
    },
    include: { category: true, responsible: { select: { id: true, name: true, avatarColor: true } } },
  })

  return NextResponse.json({ transaction: duplicated })
}
