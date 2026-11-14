import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const cards = await db.card.findMany({
    where: { familyId: user.family.id },
    include: {
      responsible: { select: { id: true, name: true, avatarColor: true } },
      purchases: {
        orderBy: { purchaseDate: "desc" },
      },
    },
    orderBy: { name: "asc" },
  })

  // Para cada cartão, calcula valor utilizado e limite disponível com base nas parcelas futuras
  const result = cards.map((card) => {
    // Total utilizado = soma das parcelas ainda a vencer
    const now = new Date()
    let used = 0
    let futureCommitments = 0

    for (const purchase of card.purchases) {
      // Calcula quantas parcelas ainda vão vencer
      const installmentAmount = purchase.installmentAmount
      const purchaseDate = new Date(purchase.purchaseDate)
      // Quantas parcelas já passaram do fechamento atual
      const monthsElapsed = Math.max(0, (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth()))
      const remainingInstallments = Math.max(0, purchase.installments - monthsElapsed)
      used += installmentAmount * remainingInstallments
      futureCommitments += installmentAmount * Math.max(0, remainingInstallments - 1) // próximas faturas
    }

    return {
      ...card,
      usedAmount: used,
      availableLimit: card.creditLimit - used,
      futureCommitments,
    }
  })

  return NextResponse.json({ cards: result })
}

const createSchema = z.object({
  name: z.string().min(2),
  institution: z.string().optional().nullable(),
  creditLimit: z.number().positive("Limite deve ser positivo"),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  responsibleId: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const card = await db.card.create({
    data: {
      ...parsed.data,
      institution: parsed.data.institution || null,
      responsibleId: parsed.data.responsibleId || null,
      familyId: user.family.id,
    },
  })

  return NextResponse.json({ card })
}
