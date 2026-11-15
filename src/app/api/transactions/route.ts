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

    // ===== DETECTA COMPRA PARCELADA NO CARTÃO =====
    // Condição: despesa + pagamento no crédito + cartão selecionado + mais de 1 parcela
    const isInstallmentPurchase =
      data.type === "EXPENSE" &&
      data.cardId &&
      data.paymentMethod === "CREDIT" &&
      data.installments > 1

    if (isInstallmentPurchase) {
      // Busca o cartão para pegar o dia de vencimento
      const card = await db.card.findFirst({
        where: { id: data.cardId, familyId: user.family.id },
      })
      if (!card) {
        return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 })
      }

      const installmentAmount = data.amount / data.installments
      const purchaseDate = new Date(data.transactionDate)

      // 1. Cria o registro da compra parcelada (aparece na aba Cartões)
      const purchase = await db.cardPurchase.create({
        data: {
          description: data.description,
          totalAmount: data.amount,
          purchaseDate: purchaseDate,
          installments: data.installments,
          installmentAmount,
          categoryId: data.categoryId || null,
          cardId: card.id,
          familyId: user.family.id,
        },
      })

      // 2. Cria um lançamento por parcela, cada uma no mês correspondente
      // Parcela 1: mês da compra (no dia de vencimento do cartão)
      // Parcela 2: mês seguinte
      // Parcela N: mês + (N-1)
      const createdTransactions = []
      for (let i = 0; i < data.installments; i++) {
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
            isVariable: true,
            installments: data.installments,
            notes: `Compra parcelada - parcela ${i + 1} de ${data.installments}`,
            categoryId: data.categoryId || null,
            responsibleId: data.responsibleId || null,
            accountId: null,
            cardId: card.id,
            cardPurchaseId: purchase.id,
            createdById: user.id,
            familyId: user.family.id,
          },
        })
        createdTransactions.push(tx)
      }

      // Log de auditoria
      await db.auditLog.create({
        data: {
          action: "CREATE",
          entity: "CardPurchase",
          entityId: purchase.id,
          summary: `Compra parcelada: ${data.description} - ${data.installments}x de R$ ${installmentAmount.toFixed(2)}`,
          familyId: user.family.id,
          userId: user.id,
        },
      })

      // Retorna a primeira parcela + contador
      return NextResponse.json({
        transaction: createdTransactions[0],
        transactionsCreated: createdTransactions.length,
        isInstallmentPurchase: true,
        installmentAmount,
      })
    }

    // ===== FLUXO NORMAL: única transação =====
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
