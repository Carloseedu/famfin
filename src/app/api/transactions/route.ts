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
    // Filtra por competenciaDate (se preenchido) OU transactionDate (se competenciaDate é null)
    where.OR = [
      { competenciaDate: { gte: start, lt: end } },
      { competenciaDate: null, transactionDate: { gte: start, lt: end } },
    ]
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
  // Mês de competência (opcional): { mes: 1-12, ano: 2026 } ou null
  competenciaMes: z.number().int().min(1).max(12).optional().nullable(),
  competenciaAno: z.number().int().min(2000).optional().nullable(),
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

    // ===== DETECTA DESPESA FIXA =====
    // Condição: isFixed = true → cria 6 lançamentos (mês atual + 5 futuros)
    // Todos vinculados pelo mesmo recurrenceGroupId
    const isFixedBill = data.isFixed === true && data.type === "EXPENSE"

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
      // Se o usuário preencheu mês de competência, usa ELE como base para a distribuição
      // (ex: compra em 13/11 com competência dezembro → parcela 1 em dez, parcela 2 em jan)
      // Caso contrário, usa o mês da compra como base (comportamento padrão)
      let baseYear = purchaseDate.getFullYear()
      let baseMonth = purchaseDate.getMonth()
      if (data.competenciaMes && data.competenciaAno) {
        baseYear = data.competenciaAno
        baseMonth = data.competenciaMes - 1 // JS months são 0-indexed
      }

      const createdTransactions = []
      for (let i = 0; i < data.installments; i++) {
        // JavaScript trata automaticamente o "rollover" de ano:
        // new Date(2026, 11 + 1, 15) = 15 de janeiro de 2027 ✓
        const installmentDate = new Date(
          baseYear,
          baseMonth + i,
          Math.min(card.dueDay, 28) // clamp para evitar overflow de dia 31
        )

        // PRIMEIRA parcela (i=0): respeita o status escolhido pelo usuário (Pago/Pendente)
        // DEMAIS parcelas (i>0): sempre Pendente (não foram pagas ainda)
        const isFirstInstallment = i === 0
        const installmentStatus = isFirstInstallment ? data.status : "PENDING"
        const installmentPaidDate = isFirstInstallment && data.status === "PAID"
          ? (data.paidDate ? new Date(data.paidDate) : new Date())
          : null

        const tx = await db.transaction.create({
          data: {
            type: "EXPENSE",
            description: `${data.description} ${i + 1}/${data.installments}`,
            amount: installmentAmount,
            transactionDate: installmentDate,
            dueDate: installmentDate,
            // Define competenciaDate igual à installmentDate para garantir
            // que cada parcela seja contabilizada no mês correto, mesmo se o
            // usuário mudar a transactionDate depois via edição
            competenciaDate: installmentDate,
            paidDate: installmentPaidDate,
            paymentMethod: "CREDIT",
            status: installmentStatus,
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

    // ===== FLUXO DESPESA FIXA: cria 6 lançamentos (mês atual + 5 futuros) =====
    if (isFixedBill) {
      const groupId = `fixed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const originalDate = new Date(data.transactionDate)
      const createdFixed: any[] = []

      for (let i = 0; i < 6; i++) {
        const monthDate = new Date(
          originalDate.getFullYear(),
          originalDate.getMonth() + i,
          originalDate.getDate() > 28 ? 28 : originalDate.getDate()
        )

        const tx = await db.transaction.create({
          data: {
            type: "EXPENSE",
            description: data.description,
            amount: data.amount,
            transactionDate: monthDate,
            dueDate: data.dueDate
              ? new Date(
                  new Date(data.dueDate).getFullYear(),
                  new Date(data.dueDate).getMonth() + i,
                  Math.min(new Date(data.dueDate).getDate(), 28)
                )
              : monthDate,
            paidDate: i === 0 && data.status === "PAID" ? new Date() : null,
            paymentMethod: data.paymentMethod || null,
            status: i === 0 ? data.status : "PENDING",
            isFixed: true,
            isVariable: false,
            recurrence: data.recurrence || "MONTHLY",
            installments: 1,
            notes: data.notes || "Despesa fixa recorrente",
            recurrenceGroupId: groupId,
            categoryId: data.categoryId || null,
            responsibleId: data.responsibleId || null,
            accountId: data.accountId || null,
            cardId: data.cardId || null,
            createdById: user.id,
            familyId: user.family.id,
          },
        })
        createdFixed.push(tx)
      }

      await db.auditLog.create({
        data: {
          action: "CREATE",
          entity: "Transaction",
          entityId: createdFixed[0].id,
          summary: `Despesa fixa criada: ${data.description} - R$ ${data.amount.toFixed(2)} (6 meses)`,
          familyId: user.family.id,
          userId: user.id,
        },
      })

      return NextResponse.json({
        transaction: createdFixed[0],
        transactionsCreated: 6,
        isFixedBill: true,
        groupId,
      })
    }

    // ===== FLUXO NORMAL: única transação =====
    // Calcula competenciaDate se o usuário informou mês/ano de competência
    const competenciaDate =
      data.competenciaMes && data.competenciaAno
        ? new Date(data.competenciaAno, data.competenciaMes - 1, 1)
        : null

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
        competenciaDate,
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
