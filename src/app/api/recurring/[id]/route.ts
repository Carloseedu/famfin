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
  const existing = await db.recurringBill.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!existing) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  // Desativa em vez de excluir permanentemente
  await db.recurringBill.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}

// POST /api/recurring/[id]?action=generate — gera lançamentos pendentes
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const bill = await db.recurringBill.findFirst({
    where: { id, familyId: user.family.id },
  })
  if (!bill) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const existing = await db.transaction.findFirst({
    where: {
      familyId: user.family.id,
      recurrenceGroupId: bill.id,
      transactionDate: {
        gte: new Date(year, month, 1),
        lt: new Date(year, month + 1, 1),
      },
    },
  })
  if (existing) {
    return NextResponse.json({ message: "Já existe lançamento para este mês", transaction: existing })
  }

  const dueDate = new Date(year, month, Math.min(bill.dueDay, 28))
  const tx = await db.transaction.create({
    data: {
      type: "EXPENSE",
      description: bill.description,
      amount: bill.expectedAmount,
      transactionDate: new Date(),
      dueDate,
      status: "PENDING",
      isFixed: true,
      isVariable: false,
      recurrence: bill.frequency,
      recurrenceGroupId: bill.id,
      categoryId: bill.categoryId,
      responsibleId: bill.responsibleId,
      createdById: user.id,
      familyId: user.family.id,
    },
  })

  await db.recurringBill.update({
    where: { id: bill.id },
    data: { lastGenerated: new Date() },
  })

  return NextResponse.json({ transaction: tx })
}
