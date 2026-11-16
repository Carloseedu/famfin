import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

// GET /api/account/export â baixa TODOS os dados do usuÃ¡rio em JSON
// Atende ao direito de portabilidade da LGPD
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "NÃ£o autenticado" }, { status: 401 })

  const familyId = user.family.id

  // Busca todos os dados da famÃ­lia do usuÃ¡rio
  const [family, users, categories, accounts, cards, transactions, recurring, budgets, goals, auditLogs] = await Promise.all([
    db.family.findUnique({ where: { id: familyId } }),
    db.user.findMany({
      where: { familyId },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, createdAt: true },
    }),
    db.category.findMany({ where: { familyId } }),
    db.account.findMany({ where: { familyId } }),
    db.card.findMany({ where: { familyId }, include: { purchases: true } }),
    db.transaction.findMany({
      where: { familyId },
      include: { category: true, account: true, card: true, responsible: { select: { name: true } } },
    }),
    db.recurringBill.findMany({ where: { familyId } }),
    db.budget.findMany({ where: { familyId } }),
    db.goal.findMany({ where: { familyId } }),
    db.auditLog.findMany({ where: { familyId }, take: 100, orderBy: { createdAt: "desc" } }),
  ])

  const exportedAt = new Date().toISOString()
  const data = {
    exportedAt,
    family,
    users,
    categories,
    accounts,
    cards,
    transactions,
    recurring,
    budgets,
    goals,
    auditLogs,
    _meta: {
      totalTransactions: transactions.length,
      totalCategories: categories.length,
      totalCards: cards.length,
      totalBudgets: budgets.length,
      totalGoals: goals.length,
      note: "Dados exportados conforme LGPD art. 18, V (portabilidade). Este arquivo contÃ©m todos os dados da famÃ­lia vinculados Ã  sua conta.",
    },
  }

  const json = JSON.stringify(data, null, 2)

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="famfin-dados-${family?.name?.toLowerCase().replace(/\s+/g, "-")}-${exportedAt.split("T")[0]}.json"`,
    },
  })
}
