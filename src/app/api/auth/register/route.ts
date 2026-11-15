import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, createSession } from "@/lib/auth"
import { z } from "zod"

const registerSchema = z.object({
  familyName: z.string().min(2, "Nome da família deve ter ao menos 2 caracteres"),
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  persist: z.boolean().optional().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 }
      )
    }

    const { familyName, name, email, password, persist } = parsed.data

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json(
        { error: "E-mail já cadastrado. Faça login ou use outro e-mail." },
        { status: 409 }
      )
    }

    // Cria a família e o admin em uma transação
    const family = await db.family.create({ data: { name: familyName } })

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: await hashPassword(password),
        role: "ADMIN",
        familyId: family.id,
      },
    })

    // Cria categorias padrão em LOTE (uma única query) — muito mais rápido
    const expenseCategories = [
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
    const incomeCategories = [
      { name: "Salário", color: "#16a34a" },
      { name: "Renda extra", color: "#65a30d" },
      { name: "Benefícios", color: "#0d9488" },
      { name: "Reembolsos", color: "#0891b2" },
      { name: "Outros", color: "#64748b" },
    ]

    await db.category.createMany({
      data: [
        ...expenseCategories.map((c) => ({ ...c, type: "EXPENSE", isDefault: true, familyId: family.id })),
        ...incomeCategories.map((c) => ({ ...c, type: "INCOME", isDefault: true, familyId: family.id })),
      ],
    })

    const token = await createSession(user.id, persist)

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      family: { id: family.id, name: family.name },
    })

    res.cookies.set("fin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: persist ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
    })

    return res
  } catch (err: any) {
    console.error("Register error:", err)
    return NextResponse.json({ error: "Erro interno ao cadastrar" }, { status: 500 })
  }
}

export async function GET() {
  // Verifica sessão atual
  const cookieStore = await import("next/headers").then((m) => m.cookies())
  const token = cookieStore.get("fin_session")?.value

  if (!token) return NextResponse.json({ user: null }, { status: 200 })

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { family: true } } },
  })

  if (!session) return NextResponse.json({ user: null }, { status: 200 })
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } })
    return NextResponse.json({ user: null }, { status: 200 })
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      avatarColor: session.user.avatarColor,
    },
    family: { id: session.user.family.id, name: session.user.family.name },
  })
}
