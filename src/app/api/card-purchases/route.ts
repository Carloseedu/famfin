import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

// GET /api/card-purchases?cardId=...
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const url = new URL(req.url)
  const cardId = url.searchParams.get("cardId")

  const where: any = { familyId: user.family.id }
  if (cardId) where.cardId = cardId

  const purchases = await db.cardPurchase.findMany({
    where,
    include: {
      card: true,
      category: true,
    },
    orderBy: { purchaseDate: "desc" },
  })

  return NextResponse.json({ purchases })
}

const createSchema = z.object({
  description: z.string().min(1),
  totalAmount: z.number().positive(),
  purchaseDate: z.string(),
  installments: z.number().int().min(1).default(1),
  categoryId: z.string().optional().nullable(),
  cardId: z.string(),
  responsibleId: z.string().optional().nullable(),
})

// POST cria uma compra parcelada e gera N lançamentos de EXPENSE (um por parcela)
// Cada parcela fica no mês correspondente ao seu vencimento, permitindo
// visualizar os compromissos futuros no dashboard de cada mês.
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
    const card = await db.card.findFirst({
      where: { id: data.cardId, familyId: user.family.id },
    })
    if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 })

    const installmentAmount = data.totalAmount / data.installments

    const purchase = await db.cardPurchase.create({
      data: {
        description: data.description,
        totalAmount: data.totalAmount,
        purchaseDate: new Date(data.purchaseDate),
        installments: data.installments,
        installmentAmount,
        categoryId: data.categoryId || null,
        cardId: card.id,
        familyId: user.family.id,
      },
    })

    // Gera lançamentos por parcela
    // REGRA: cada parcela fica no mês correspondente ao seu vencimento.
    // - Parcela 1: mês da compra (no dia de vencimento do cartão)
    // - Parcela 2: mês seguinte
    // - Parcela N: mês + (N-1)
    // Assim o dashboard de cada mês mostra apenas as parcelas que vencem nele,
    // permitindo ver os compromissos futuros.
    const purchaseDate = new Date(data.purchaseDate)
    const transactions = []

    for (let i = 0; i < data.installments; i++) {
      // Calcula a data de vencimento da parcela i (mês da compra + i)
      const installmentDate = new Date(
        purchaseDate.getFullYear(),
        purchaseDate.getMonth() + i,
        Math.min(card.dueDay, 28) // clamp para evitar overflow de dia 31
      )

      const tx = await db.transaction.create({
        data: {
          type: "EXPENSE",
          description: `${data.description} ${i + 1}/${data.installments}`,
          amount: installmentAmount,
          transactionDate: installmentDate,
          dueDate: installmentDate,
          paidDate: null,
          paymentMethod: "CREDIT",
          status: "PENDING",
          isFixed: false,
          isVariable: data.installments > 1,
          installments: data.installments,
          notes: `Compra parcelada - parcela ${i + 1} de ${data.installments}`,
          categoryId: data.categoryId || null,
          responsibleId: data.responsibleId || user.id,
          cardId: card.id,
          createdById: user.id,
          familyId: user.family.id,
        },
      })
      transactions.push(tx.id)
    }

    return NextResponse.json({ purchase, transactionsCreated: transactions.length })
  } catch (err: any) {
    console.error("Create purchase error:", err)
    return NextResponse.json({ error: "Erro ao registrar compra" }, { status: 500 })
  }
}
