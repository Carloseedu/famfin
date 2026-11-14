import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"

// Endpoint de recuperação de senha (simplificado):
// Marca um token de reset, em produção enviaria e-mail.
const recoverSchema = z.object({
  email: z.string().email("E-mail inválido"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = recoverSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })

    // Por segurança, sempre retorna sucesso (não revela se o e-mail existe)
    // Em produção: gerar token e enviar e-mail com link de reset.
    if (user) {
      // Aqui seria gravado um token de reset em tabela separada com expiração.
      // Por enquanto, apenas logamos.
      console.log(`[Recuperação] Reset solicitado para ${email}`)
    }

    return NextResponse.json({
      ok: true,
      message:
        "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
    })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao processar solicitação" }, { status: 500 })
  }
}
