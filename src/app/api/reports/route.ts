import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

// GET /api/reports?type=expenses_by_category&month=11&year=2026
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const url = new URL(req.url)
  const reportType = url.searchParams.get("type") || "summary"
  const now = new Date()
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1), 10)
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()), 10)

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const transactions = await db.transaction.findMany({
    where: {
      familyId: user.family.id,
      transactionDate: { gte: start, lt: end },
    },
    include: {
      category: true,
      responsible: { select: { id: true, name: true, avatarColor: true } },
      card: true,
      account: true,
    },
    orderBy: { transactionDate: "desc" },
  })

  if (reportType === "summary") {
    // Resumo geral
    const income = transactions.filter((t) => t.type === "INCOME")
    const expense = transactions.filter((t) => t.type === "EXPENSE")
    const fixed = expense.filter((t) => t.isFixed)
    const variable = expense.filter((t) => !t.isFixed)
    const paid = expense.filter((t) => t.status === "PAID")
    const pending = expense.filter((t) => t.status !== "PAID")

    const byCategory: Record<string, { name: string; value: number; color: string }> = {}
    for (const t of expense) {
      const k = t.categoryId || "none"
      if (!byCategory[k]) {
        byCategory[k] = {
          name: t.category?.name || "Sem categoria",
          value: 0,
          color: t.category?.color || "#64748b",
        }
      }
      byCategory[k].value += t.amount
    }

    const byMember: Record<string, { name: string; value: number; color: string }> = {}
    for (const t of expense) {
      const k = t.responsibleId || "none"
      if (!byMember[k]) {
        byMember[k] = {
          name: t.responsible?.name || "Sem responsável",
          value: 0,
          color: t.responsible?.avatarColor || "#64748b",
        }
      }
      byMember[k].value += t.amount
    }

    const incomeByMember: Record<string, { name: string; value: number; color: string }> = {}
    for (const t of income) {
      const k = t.responsibleId || "none"
      if (!incomeByMember[k]) {
        incomeByMember[k] = {
          name: t.responsible?.name || "Sem responsável",
          value: 0,
          color: t.responsible?.avatarColor || "#64748b",
        }
      }
      incomeByMember[k].value += t.amount
    }

    return NextResponse.json({
      reportType,
      month,
      year,
      totals: {
        income: income.reduce((s, t) => s + t.amount, 0),
        expense: expense.reduce((s, t) => s + t.amount, 0),
        fixed: fixed.reduce((s, t) => s + t.amount, 0),
        variable: variable.reduce((s, t) => s + t.amount, 0),
        paid: paid.reduce((s, t) => s + t.amount, 0),
        pending: pending.reduce((s, t) => s + t.amount, 0),
        card: expense.filter((t) => t.cardId).reduce((s, t) => s + t.amount, 0),
      },
      byCategory: Object.values(byCategory).sort((a, b) => b.value - a.value),
      byMember: Object.values(byMember).sort((a, b) => b.value - a.value),
      incomeByMember: Object.values(incomeByMember).sort((a, b) => b.value - a.value),
      count: transactions.length,
    })
  }

  if (reportType === "transactions") {
    return NextResponse.json({
      reportType,
      month,
      year,
      transactions: transactions.map((t) => ({
        id: t.id,
        data: t.transactionDate,
        descricao: t.description,
        tipo: t.type === "INCOME" ? "Receita" : "Despesa",
        categoria: t.category?.name || "—",
        responsavel: t.responsible?.name || "—",
        valor: t.amount,
        status: t.status,
        pagamento: t.paymentMethod || "—",
        conta: t.account?.name || "—",
        cartao: t.card?.name || "—",
        fixa: t.isFixed ? "Sim" : "Não",
      })),
    })
  }

  if (reportType === "upcoming_installments") {
    // Parcelamentos futuros
    const purchases = await db.cardPurchase.findMany({
      where: { familyId: user.family.id },
      include: { card: true, category: true },
    })
    return NextResponse.json({
      reportType,
      month,
      year,
      purchases: purchases.map((p) => ({
        id: p.id,
        descricao: p.description,
        cartao: p.card.name,
        total: p.totalAmount,
        parcelas: p.installments,
        valorParcela: p.installmentAmount,
        dataCompra: p.purchaseDate,
        categoria: p.category?.name || "—",
      })),
    })
  }

  return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 })
}
