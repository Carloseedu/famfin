import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

// GET /api/budgets?month=11&year=2026
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const url = new URL(req.url)
  const now = new Date()
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1), 10)
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()), 10)

  const budgets = await db.budget.findMany({
    where: { familyId: user.family.id, month, year },
    include: { category: true },
  })

  // Calcula realizado por categoria
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const transactions = await db.transaction.findMany({
    where: {
      familyId: user.family.id,
      type: "EXPENSE",
      transactionDate: { gte: start, lt: end },
    },
    select: { categoryId: true, amount: true },
  })

  const spentByCategory: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.categoryId) {
      spentByCategory[tx.categoryId] = (spentByCategory[tx.categoryId] || 0) + tx.amount
    }
  }

  const result = budgets.map((b) => ({
    ...b,
    spent: spentByCategory[b.categoryId] || 0,
    remaining: b.limit - (spentByCategory[b.categoryId] || 0),
    percentUsed: b.limit > 0 ? ((spentByCategory[b.categoryId] || 0) / b.limit) * 100 : 0,
  }))

  return NextResponse.json({ budgets: result })
}

const upsertSchema = z.object({
  categoryId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  limit: z.number().positive("Limite deve ser positivo"),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { categoryId, month, year, limit } = parsed.data

    const budget = await db.budget.upsert({
      where: {
        familyId_categoryId_month_year: {
          familyId: user.family.id,
          categoryId,
          month,
          year,
        },
      },
      create: {
        familyId: user.family.id,
        categoryId,
        month,
        year,
        limit,
      },
      update: { limit },
    })

    return NextResponse.json({ budget })
  } catch (err: any) {
    return NextResponse.json({ error: "Erro ao salvar orçamento" }, { status: 500 })
  }
}
