import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

// GET /api/dashboard?month=11&year=2026
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const url = new URL(req.url)
  const now = new Date()
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1), 10)
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()), 10)

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  // Lançamentos do mês
  const transactions = await db.transaction.findMany({
    where: {
      familyId: user.family.id,
      OR: [
        { competenciaDate: { gte: start, lt: end } },
        { competenciaDate: null, transactionDate: { gte: start, lt: end } },
      ],
    },
    include: {
      category: true,
      responsible: { select: { id: true, name: true, avatarColor: true } },
    },
  })

  const incomes = transactions.filter((t) => t.type === "INCOME")
  const expenses = transactions.filter((t) => t.type === "EXPENSE")

  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  // Pendentes (não pagas)
  const pending = transactions.filter((t) => t.status !== "PAID")
  const pendingAmount = pending.reduce((s, t) => s + t.amount, 0)

  // Contas atrasadas
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = transactions.filter(
    (t) => t.status !== "PAID" && t.dueDate && new Date(t.dueDate) < today
  )

  // Próximas do vencimento (7 dias)
  const next7 = new Date(today)
  next7.setDate(next7.getDate() + 7)
  const upcoming = transactions.filter(
    (t) =>
      t.status !== "PAID" &&
      t.dueDate &&
      new Date(t.dueDate) >= today &&
      new Date(t.dueDate) <= next7
  )

  // Total faturas de cartão do mês
  const cardExpenses = expenses.filter((t) => t.cardId)
  const cardTotal = cardExpenses.reduce((s, t) => s + t.amount, 0)

  // Saldo disponível = saldo - pendências
  const availableAfterCommitments = balance - pendingAmount

  // ===== GRÁFICOS =====

  // Despesas por categoria
  const expensesByCategory: Record<string, { name: string; value: number; color: string }> = {}
  for (const t of expenses) {
    const key = t.categoryId || "none"
    if (!expensesByCategory[key]) {
      expensesByCategory[key] = {
        name: t.category?.name || "Sem categoria",
        value: 0,
        color: t.category?.color || "#64748b",
      }
    }
    expensesByCategory[key].value += t.amount
  }

  // Despesas por integrante
  const expensesByMember: Record<string, { name: string; value: number; color: string }> = {}
  for (const t of expenses) {
    const key = t.responsibleId || "none"
    if (!expensesByMember[key]) {
      expensesByMember[key] = {
        name: t.responsible?.name || "Sem responsável",
        value: 0,
        color: t.responsible?.avatarColor || "#64748b",
      }
    }
    expensesByMember[key].value += t.amount
  }

  // Receitas por integrante
  const incomeByMember: Record<string, { name: string; value: number; color: string }> = {}
  for (const t of incomes) {
    const key = t.responsibleId || "none"
    if (!incomeByMember[key]) {
      incomeByMember[key] = {
        name: t.responsible?.name || "Sem responsável",
        value: 0,
        color: t.responsible?.avatarColor || "#64748b",
      }
    }
    incomeByMember[key].value += t.amount
  }

  // Evolução dos últimos 6 meses (receitas vs despesas)
  const evolution = []
  const fixedEvolution = [] // ← novo: contas fixas por mês
  for (let i = 5; i >= 0; i--) {
    const m = month - 1 - i
    const y = year
    const evStart = new Date(y, m, 1)
    const evEnd = new Date(y, m + 1, 1)
    const monthLabel = evStart.toLocaleDateString("pt-BR", { month: "short" })

    const monthTx = await db.transaction.findMany({
      where: {
        familyId: user.family.id,
        OR: [
          { competenciaDate: { gte: evStart, lt: evEnd } },
          { competenciaDate: null, transactionDate: { gte: evStart, lt: evEnd } },
        ],
      },
      select: { type: true, amount: true, isFixed: true },
    })
    const inc = monthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
    const exp = monthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)
    const fixedExp = monthTx.filter((t) => t.type === "EXPENSE" && t.isFixed).reduce((s, t) => s + t.amount, 0)
    evolution.push({
      month: monthLabel.replace(".", ""),
      receitas: inc,
      despesas: exp,
      saldo: inc - exp,
    })
    fixedEvolution.push({
      month: monthLabel.replace(".", ""),
      total: fixedExp,
    })
  }

  // Comparativo do mês atual vs mês anterior
  const prevStart = new Date(year, month - 2, 1)
  const prevEnd = new Date(year, month - 1, 1)
  const prevTx = await db.transaction.findMany({
    where: {
      familyId: user.family.id,
      OR: [
        { competenciaDate: { gte: prevStart, lt: prevEnd } },
        { competenciaDate: null, transactionDate: { gte: prevStart, lt: prevEnd } },
      ],
    },
    select: { type: true, amount: true },
  })
  const prevIncome = prevTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const prevExpense = prevTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

  // Indicadores de orçamento
  const budgets = await db.budget.findMany({
    where: { familyId: user.family.id, month, year },
    include: { category: true },
  })
  const budgetAlerts = budgets
    .map((b) => {
      const spent = expenses
        .filter((e) => e.categoryId === b.categoryId)
        .reduce((s, e) => s + e.amount, 0)
      const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0
      return {
        category: b.category.name,
        limit: b.limit,
        spent,
        percent,
        exceeded: percent >= 100,
        warning: percent >= 80,
      }
    })
    .filter((b) => b.warning || b.exceeded)

  // Movimentações recentes (10 últimas)
  const recent = transactions
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
    .slice(0, 10)

  return NextResponse.json({
    month,
    year,
    cards: {
      totalIncome,
      totalExpense,
      balance,
      pendingCount: pending.length,
      pendingAmount,
      cardTotal,
      availableAfterCommitments,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, t) => s + t.amount, 0),
    },
    charts: {
      expensesByCategory: Object.values(expensesByCategory).sort((a, b) => b.value - a.value),
      expensesByMember: Object.values(expensesByMember).sort((a, b) => b.value - a.value),
      incomeByMember: Object.values(incomeByMember).sort((a, b) => b.value - a.value),
      evolution,
      fixedEvolution,
      comparison: {
        current: { income: totalIncome, expense: totalExpense, balance },
        previous: { income: prevIncome, expense: prevExpense, balance: prevIncome - prevExpense },
      },
    },
    indicators: {
      upcoming,
      overdue,
      budgetAlerts,
    },
    recent,
  })
}
