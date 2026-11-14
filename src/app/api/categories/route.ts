import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const categories = await db.category.findMany({
    where: { familyId: user.family.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })

  return NextResponse.json({ categories })
}

const createSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().default("#3b82f6"),
  icon: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  // Apenas ADMIN pode cadastrar categorias
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores podem gerenciar categorias" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const existing = await db.category.findFirst({
      where: { familyId: user.family.id, name: parsed.data.name, type: parsed.data.type },
    })
    if (existing) {
      return NextResponse.json({ error: "Categoria já existe" }, { status: 409 })
    }

    const category = await db.category.create({
      data: {
        ...parsed.data,
        icon: parsed.data.icon || null,
        isDefault: false,
        familyId: user.family.id,
      },
    })

    return NextResponse.json({ category })
  } catch (err: any) {
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 })
  }
}
