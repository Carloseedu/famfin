import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const goals = await db.goal.findMany({
    where: { familyId: user.family.id, archived: false },
    include: { responsible: { select: { id: true, name: true, avatarColor: true } } },
    orderBy: { createdAt: "desc" },
  })

  const result = goals.map((g) => ({
    ...g,
    percent: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0,
  }))

  return NextResponse.json({ goals: result })
}

const createSchema = z.object({
  name: z.string().min(2),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  color: z.string().default("#1e3a8a"),
  responsibleId: z.string().optional().nullable(),
})

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
    const goal = await db.goal.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        notes: data.notes || null,
        color: data.color,
        responsibleId: data.responsibleId || null,
        familyId: user.family.id,
      },
    })

    return NextResponse.json({ goal })
  } catch (err: any) {
    return NextResponse.json({ error: "Erro ao criar meta" }, { status: 500 })
  }
}
