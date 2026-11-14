import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword, createSession } from "@/lib/auth"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
  persist: z.boolean().optional().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 }
      )
    }

    const { email, password, persist } = parsed.data

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { family: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos" },
        { status: 401 }
      )
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos" },
        { status: 401 }
      )
    }

    const token = await createSession(user.id, persist)

    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor,
      },
      family: { id: user.family.id, name: user.family.name },
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
    console.error("Login error:", err)
    return NextResponse.json({ error: "Erro interno ao entrar" }, { status: 500 })
  }
}
