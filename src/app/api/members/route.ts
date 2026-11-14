import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { hashPassword } from "@/lib/auth"
import { z } from "zod"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const members = await db.user.findMany({
    where: { familyId: user.family.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarColor: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ members, currentUserId: user.id, family: { id: user.family.id, name: user.family.name } })
}

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
})

// Adiciona integrante à família atual (em produção: convite por e-mail com link)
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores podem convidar integrantes" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 })
    }

    const member = await db.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        familyId: user.family.id,
      },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, createdAt: true },
    })

    await db.auditLog.create({
      data: {
        action: "CREATE",
        entity: "User",
        entityId: member.id,
        summary: `Integrante adicionado: ${member.name} (${member.email})`,
        familyId: user.family.id,
        userId: user.id,
      },
    })

    return NextResponse.json({ member })
  } catch (err: any) {
    return NextResponse.json({ error: "Erro ao adicionar integrante" }, { status: 500 })
  }
}
