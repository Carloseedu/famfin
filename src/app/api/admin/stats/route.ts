import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

// GET /api/admin/stats â estatÃ­sticas globais da plataforma (sÃ³ super admin)
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "NÃ£o autenticado" }, { status: 401 })
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  // Conta as entidades principais
  const [totalFamilies, totalUsers, totalTransactions, totalCategories, totalCards, totalGoals] = await Promise.all([
    db.family.count(),
    db.user.count(),
    db.transaction.count(),
    db.category.count(),
    db.card.count(),
    db.goal.count(),
  ])

  // Ãltimas 10 famÃ­lias cadastradas
  const recentFamilies = await db.family.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      users: { select: { id: true, name: true, email: true, createdAt: true } },
      _count: { select: { transactions: true, users: true } },
    },
  })

  // FamÃ­lias ativas nos Ãºltimos 7 dias (com sessÃ£o recente)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const activeSessions = await db.session.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { userId: true },
    distinct: ["userId"],
  })
  const activeUsers7d = activeSessions.length

  // Convidados (cÃ³digos)
  const inviteCodes = await db.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  // Estimativa do tamanho do banco
  const estimatedDbSizeMB = (
    (totalFamilies * 80) +
    (totalTransactions * 0.5) +
    (totalUsers * 0.5) +
    (totalCategories * 0.3)
  ) / 1024

  return NextResponse.json({
    stats: {
      totalFamilies,
      totalUsers,
      totalTransactions,
      totalCategories,
      totalCards,
      totalGoals,
      activeUsers7d,
      estimatedDbSizeMB: Math.round(estimatedDbSizeMB * 100) / 100,
      dbCapacityPercent: Math.round((estimatedDbSizeMB / 500) * 100),
    },
    recentFamilies: recentFamilies.map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdAt,
      membersCount: f._count.users,
      transactionsCount: f._count.transactions,
      adminName: f.users[0]?.name || "â",
      adminEmail: f.users[0]?.email || "â",
    })),
    inviteCodes: inviteCodes.map((c) => ({
      id: c.id,
      code: c.code,
      maxUses: c.maxUses,
      uses: c.uses,
      active: c.active,
      expiresAt: c.expiresAt,
      note: c.note,
      createdAt: c.createdAt,
    })),
  })
}
