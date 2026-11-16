import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"
import { randomBytes } from "crypto"

// GET /api/admin/invite-codes â lista todos os cÃ³digos
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "NÃ£o autenticado" }, { status: 401 })
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const codes = await db.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ codes })
}

const createSchema = z.object({
  maxUses: z.number().int().min(0).default(1), // 0 = ilimitado
  note: z.string().optional(),
  expiresInDays: z.number().int().min(1).optional(), // expira em N dias (opcional)
})

// POST /api/admin/invite-codes â gera novo cÃ³digo
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "NÃ£o autenticado" }, { status: 401 })
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message },
        { status: 400 }
      )
    }
    const data = parsed.data

    // Gera cÃ³digo no formato FAMFIN-XXXX-XXXX (12 chars total)
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sem caracteres ambÃ­guos
      const segment = (n: number) => Array.from(
        { length: n },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("")
      return `FAMFIN-${segment(4)}-${segment(4)}`
    }

    // Tenta gerar um cÃ³digo Ãºnico (atÃ© 5 tentativas)
    let code = generateCode()
    for (let i = 0; i < 5; i++) {
      const existing = await db.inviteCode.findUnique({ where: { code } })
      if (!existing) break
      code = generateCode()
    }

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const invite = await db.inviteCode.create({
      data: {
        code,
        maxUses: data.maxUses,
        note: data.note || null,
        expiresAt,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ invite })
  } catch (err: any) {
    console.error("Create invite code error:", err)
    return NextResponse.json({ error: "Erro ao criar cÃ³digo" }, { status: 500 })
  }
}
