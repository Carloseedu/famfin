import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

const deleteSchema = z.object({
  confirmEmail: z.string().email("E-mail invÃ¡lido"),
})

// POST /api/account/delete â exclui a conta + TODOS os dados da famÃ­lia
// Atende ao direito ao esquecimento da LGPD (art. 18, VI)
// â ïž AÃ§Ã£o irreversÃ­vel â sÃ³ o admin da famÃ­lia pode executar
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "NÃ£o autenticado" }, { status: 401 })

  // SÃ³ admin da famÃ­lia pode excluir TUDO
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas o administrador da famÃ­lia pode excluir a conta. PeÃ§a ao admin para fazer isso." },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    // ConfirmaÃ§Ã£o dupla: e-mail deve bater com o do usuÃ¡rio logado
    if (parsed.data.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "E-mail de confirmaÃ§Ã£o nÃ£o confere com o seu e-mail cadastrado." },
        { status: 400 }
      )
    }

    const familyId = user.family.id

    // Log de auditoria ANTES de excluir (vai ser apagado junto, mas fica registrado no momento)
    // NÃ£o dÃ¡ pra fazer log apÃ³s exclusÃ£o porque o usuÃ¡rio jÃ¡ nÃ£o existe

    // ExclusÃ£o em cascata â o Prisma cuida via onDelete: Cascade nas relaÃ§Ãµes
    // Ordem: deleta sessions primeiro, depois user, depois family
    await db.session.deleteMany({ where: { userId: user.id } })

    // Deleta o usuÃ¡rio atual (admin)
    await db.user.delete({ where: { id: user.id } })

    // Verifica se ainda tem usuÃ¡rios na famÃ­lia
    const remainingUsers = await db.user.count({ where: { familyId } })

    if (remainingUsers === 0) {
      // Se era o Ãºltimo usuÃ¡rio, deleta a famÃ­lia inteira + todos os dados
      await db.family.delete({ where: { id: familyId } })
      // Cascade deleta: categories, accounts, cards, transactions, recurring, budgets, goals, auditLogs
    }
    // Se ainda tem outros usuÃ¡rios, a famÃ­lia continua ativa para eles
    // mas os dados criados pelo admin excluÃ­do permanecem (historicamente)

    const res = NextResponse.json({
      ok: true,
      message: remainingUsers === 0
        ? "Conta excluÃ­da com sucesso. Todos os dados da famÃ­lia foram permanentemente apagados."
        : "Sua conta foi excluÃ­da. A famÃ­lia continua ativa para os demais integrantes.",
      deletedAt: new Date().toISOString(),
    })

    // Limpa o cookie de sessÃ£o
    res.cookies.delete("fin_session")

    return res
  } catch (err: any) {
    console.error("Delete account error:", err)
    return NextResponse.json({ error: "Erro ao excluir conta" }, { status: 500 })
  }
}
