import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const recurring = await db.recurringBill.findMany({
    where: { familyId: user.family.id, isActive: true },
    include: {
      category: true,
      responsible: { select: { id: true, name: true, avatarColor: true } },
    },
    orderBy: { dueDay: "asc" },
  })

  return NextResponse.json({ recurring })
}

const createSchema = z.object({
  description: z.string().min(1),
  expectedAmount: z.number().positive(),
  dueDay: z.number().int().min(1).max(28),
  frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]).default("MONTHLY"),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  responsibleId: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const data = parsed.data
    const bill = await db.recurringBill.create({
      data: {
        description: data.description,
        expectedAmount: data.expectedAmount,
        dueDay: data.dueDay,
        frequency: data.frequency,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        categoryId: data.categoryId || null,
        responsibleId: data.responsibleId || null,
        familyId: user.family.id,
      },
    })

    // Gera lançamento do mês atual se ainda não existe
    await generateMonthlyTransaction(bill.id, user.family.id, user.id)

    return NextResponse.json({ bill })
  } catch (err: any) {
    console.error("Create recurring error:", err)
    return NextResponse.json({ error: "Erro ao criar conta recorrente" }, { status: 500 })
  }
}

// Gera lançamento mensal para conta recorrente (sem duplicação)
async function generateMonthlyTransaction(
  billId: string,
  familyId: string,
  userId: string
) {
  const bill = await db.recurringBill.findUnique({
    where: { id: billId },
  })
  if (!bill || !bill.isActive) return

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // Verifica se já existe lançamento gerado para este mês (usando recurrenceGroupId)
  const existing = await db.transaction.findFirst({
    where: {
      familyId,
      recurrenceGroupId: bill.id,
      transactionDate: {
        gte: new Date(year, month, 1),
        lt: new Date(year, month + 1, 1),
      },
    },
  })
  if (existing) return

  // Vencimento no mês atual
  const dueDate = new Date(year, month, Math.min(bill.dueDay, 28))

  await db.transaction.create({
    data: {
      type: "EXPENSE",
      description: bill.description,
      amount: bill.expectedAmount,
      transactionDate: new Date(),
      dueDate,
      paymentMethod: null,
      status: "PENDING",
      isFixed: true,
      isVariable: false,
      recurrence: bill.frequency,
      installments: 1,
      notes: "Gerado automaticamente por conta recorrente",
      recurrenceGroupId: bill.id,
      categoryId: bill.categoryId,
      responsibleId: bill.responsibleId,
      createdById: userId,
      familyId,
    },
  })

  await db.recurringBill.update({
    where: { id: bill.id },
    data: { lastGenerated: new Date() },
  })
}
