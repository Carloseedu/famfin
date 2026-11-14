import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("fin_session")?.value

    if (token) {
      await db.session.deleteMany({ where: { token } })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.delete("fin_session")
    return res
  } catch (err) {
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  // Verifica sessão atual
  const user = await getSessionUser()
  return NextResponse.json({ authenticated: !!user, user: user ? { id: user.id, name: user.name } : null })
}
