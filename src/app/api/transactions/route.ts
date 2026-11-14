import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

// GET /api/transactions?month=11&year=2026&type=EXPENSE&status=PAID&categoryId=...&memberId=...&search=...
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const url = new URL(req.url)
  const month = url.searchParams.get("month")
  const year = url.searchParams.get("year")
  const type = url.searchParams.get("type")
  const status = url.searchParams.get("status")
  const categoryId = url.searchParams.get("categoryId")
  const memberId = url.searchParams.get("memberId")
  const search = url.searchParams.get("search")

  const where: any = { familyId: user.family.id }

  if (type) where.type = type
  if (status) where.status = status
  if (categoryId) where.categoryId = categoryId
  if (memberId) {
    where.OR = [
      { responsibleId: memberId },
      { createdById: memberId },
    ]
  }
  if (search) {
    where.description = { contains: search }
  }
  if (month && year) {
    const m = parseInt(month, 10)
    const y = parseInt(year, 10)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)
    where.transactionDate = { gte: start, lt: end }
  }

  const transactions = await db.transaction.findMany({
    where,
    include: {
      category: true,
      account: true,
      card: true,
      responsible: { select: { id: true, name: true, avatarColor: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { transactionDate: "desc" },
  })

  return NextResponse.json({ transactions })
}

const createSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.number().positive("Valor deve ser positivo"),
  transactionDate: z.string(),
  dueDate: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  responsibleId: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "DEBIT", "CREDIT", "TRANSFER", "PIX"]).optional().nullable(),
  accountId: z.string().optional().nullable(),
  cardId: z.string().optional().nullable(),
  status: z.enum(["PAID", "PENDING"]).default("PENDING"),
  isFixed: z.boolean().default(false),
  isVariable: z.boolean().default(true),
  recurrence: z.enum(["NONE", "MONTHLY", "WEEKLY", "YEARLY"]).optional().nullable(),
  installments: z.number().int().min(1).default(1),
  notes: z.string().optional().nullable(),
  paidDate: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 }
      )
    }
    const data = parsed.data

    const transaction = await db.transaction.create({
      data: {
        type: data.type,
        description: data.description,
        amount: data.amount,
        transactionDate: new Date(data.transactionDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paidDate: data.status === "PAID" ? (data.paidDate ? new Date(data.paidDate) : new Date()) : null,
        paymentMethod: data.paymentMethod || null,
        status: data.status,
        isFixed: data.isFixed,
        isVariable: data.isVariable,
        recurrence: data.recurrence || null,
        installments: data.installments,
        notes: data.notes || null,
        categoryId: data.categoryId || null,
        responsibleId: data.responsibleId || null,
        accountId: data.accountId || null,
        cardId: data.cardId || null,
        createdById: user.id,
        familyId: user.family.id,
      },
      include: {
        category: true,
        account: true,
        card: true,
        responsible: { select: { id: true, name: true, avatarColor: true } },
      },
    })

    // Log de auditoria
    await db.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Transaction",
        entityId: transaction.id,
        summary: `${data.type === "INCOME" ? "Receita" : "Despesa"}: ${data.description} - R$ ${data.amount.toFixed(2)}`,
        familyId: user.family.id,
        userId: user.id,
      },
    })

    return NextResponse.json({ transaction })
  } catch (err: any) {
    console.error("Create transaction error:", err)
    return NextResponse.json({ error: "Erro ao criar lançamento" }, { status: 500 })
  }
}
