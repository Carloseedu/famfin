import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/auth"

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Moradia", color: "#1e40af" },
  { name: "Financiamento imobiliário", color: "#1e3a8a" },
  { name: "Aluguel", color: "#0f766e" },
  { name: "Água", color: "#0284c7" },
  { name: "Energia elétrica", color: "#f59e0b" },
  { name: "Internet", color: "#6366f1" },
  { name: "Telefone", color: "#7c3aed" },
  { name: "Supermercado", color: "#059669" },
  { name: "Alimentação", color: "#d97706" },
  { name: "Transporte", color: "#475569" },
  { name: "Combustível", color: "#dc2626" },
  { name: "Educação", color: "#0891b2" },
  { name: "Saúde", color: "#db2777" },
  { name: "Farmácia", color: "#be185d" },
  { name: "Vestuário", color: "#9333ea" },
  { name: "Lazer", color: "#ea580c" },
  { name: "Assinaturas", color: "#2563eb" },
  { name: "Compras online", color: "#0d9488" },
  { name: "Manutenção da casa", color: "#92400e" },
  { name: "Impostos", color: "#7c2d12" },
  { name: "Outros", color: "#64748b" },
]

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salário", color: "#16a34a" },
  { name: "Renda extra", color: "#65a30d" },
  { name: "Benefícios", color: "#0d9488" },
  { name: "Reembolsos", color: "#0891b2" },
  { name: "Outros", color: "#64748b" },
]

async function main() {
  const family = await db.family.create({ data: { name: "Família Demo" } })
  console.log(`Família criada: ${family.id}`)

  const admin = await db.user.create({
    data: {
      email: "admin@familia.com",
      name: "Administrador",
      passwordHash: await hashPassword("admin123"),
      role: "ADMIN",
      familyId: family.id,
    },
  })

  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    await db.category.create({
      data: { ...cat, type: "EXPENSE", isDefault: true, familyId: family.id },
    })
  }
  for (const cat of DEFAULT_INCOME_CATEGORIES) {
    await db.category.create({
      data: { ...cat, type: "INCOME", isDefault: true, familyId: family.id },
    })
  }

  const account = await db.account.create({
    data: {
      name: "Conta Corrente",
      institution: "Banco Demo",
      type: "CHECKING",
      initialBalance: 5000,
      familyId: family.id,
    },
  })

  const card = await db.card.create({
    data: {
      name: "Cartão Principal",
      institution: "Banco Demo",
      creditLimit: 8000,
      closingDay: 5,
      dueDay: 15,
      responsibleId: admin.id,
      familyId: family.id,
    },
  })

  // Lançamentos de demonstração no mês atual
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const salário = await db.category.findFirst({ where: { familyId: family.id, name: "Salário", type: "INCOME" } })
  const supermercado = await db.category.findFirst({ where: { familyId: family.id, name: "Supermercado", type: "EXPENSE" } })
  const energia = await db.category.findFirst({ where: { familyId: family.id, name: "Energia elétrica", type: "EXPENSE" } })
  const lazer = await db.category.findFirst({ where: { familyId: family.id, name: "Lazer", type: "EXPENSE" } })
  const internet = await db.category.findFirst({ where: { familyId: family.id, name: "Internet", type: "EXPENSE" } })

  if (salário) {
    await db.transaction.create({
      data: {
        type: "INCOME", description: "Salário do mês", amount: 6500,
        transactionDate: new Date(year, month, 5),
        paidDate: new Date(year, month, 5),
        paymentMethod: "TRANSFER", status: "PAID",
        categoryId: salário.id, responsibleId: admin.id, createdById: admin.id,
        familyId: family.id,
      },
    })
  }
  if (supermercado) {
    await db.transaction.create({
      data: {
        type: "EXPENSE", description: "Compra mensal supermercado", amount: 850,
        transactionDate: new Date(year, month, 8),
        paidDate: new Date(year, month, 8),
        paymentMethod: "CREDIT", status: "PAID",
        categoryId: supermercado.id, responsibleId: admin.id, createdById: admin.id,
        cardId: card.id, familyId: family.id,
      },
    })
  }
  if (energia) {
    await db.transaction.create({
      data: {
        type: "EXPENSE", description: "Conta de luz", amount: 220,
        transactionDate: new Date(year, month, 10),
        dueDate: new Date(year, month, 20),
        paymentMethod: "PIX", status: "PENDING",
        categoryId: energia.id, responsibleId: admin.id, createdById: admin.id,
        familyId: family.id,
      },
    })
  }
  if (lazer) {
    await db.transaction.create({
      data: {
        type: "EXPENSE", description: "Cinema em família", amount: 120,
        transactionDate: new Date(year, month, 12),
        paidDate: new Date(year, month, 12),
        paymentMethod: "CREDIT", status: "PAID",
        categoryId: lazer.id, responsibleId: admin.id, createdById: admin.id,
        cardId: card.id, familyId: family.id,
      },
    })
  }
  if (internet) {
    // Recorrente
    const recurring = await db.recurringBill.create({
      data: {
        description: "Internet mensal", expectedAmount: 99.90,
        dueDay: 10, frequency: "MONTHLY", startDate: new Date(year, month, 1),
        categoryId: internet?.id, responsibleId: admin.id, familyId: family.id,
      },
    })
    // Lançamento gerado pela recorrente
    await db.transaction.create({
      data: {
        type: "EXPENSE", description: "Internet mensal", amount: 99.90,
        transactionDate: new Date(year, month, 10),
        dueDate: new Date(year, month, 10),
        paymentMethod: "PIX", status: "PENDING",
        isFixed: true, recurrence: "MONTHLY",
        recurrenceGroupId: recurring.id,
        categoryId: internet?.id, responsibleId: admin.id, createdById: admin.id,
        familyId: family.id,
      },
    })
  }

  // Orçamento do mês
  if (supermercado) {
    await db.budget.create({
      data: { month: month + 1, year, limit: 1000, categoryId: supermercado.id, familyId: family.id },
    })
  }
  if (lazer) {
    await db.budget.create({
      data: { month: month + 1, year, limit: 300, categoryId: lazer.id, familyId: family.id },
    })
  }

  // Meta
  await db.goal.create({
    data: {
      name: "Reserva de emergência",
      targetAmount: 10000,
      currentAmount: 3500,
      targetDate: new Date(year + 1, month, 1),
      notes: "Objetivo: 6 meses de despesas",
      color: "#1e3a8a",
      familyId: family.id,
    },
  })

  console.log("Seed concluído com sucesso!")
  console.log("Login demo: admin@familia.com / admin123")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
