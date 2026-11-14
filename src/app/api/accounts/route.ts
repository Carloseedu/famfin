import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const accounts = await db.account.findMany({
    where: { familyId: user.family.id },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ accounts })
}

const createSchema = z.object({
  name: z.string().min(2),
  institution: z.string().optional().nullable(),
  type: z.enum(["CHECKING", "SAVINGS", "CASH"]).default("CHECKING"),
  initialBalance: z.number().default(0),
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

  const account = await db.account.create({
    data: { ...parsed.data, institution: parsed.data.institution || null, familyId: user.family.id },
  })

  return NextResponse.json({ account })
}
