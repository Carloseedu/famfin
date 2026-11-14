import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

// GET /api/export?format=csv|excel&month=11&year=2026
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const url = new URL(req.url)
  const format = url.searchParams.get("format") || "csv"
  const now = new Date()
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1), 10)
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()), 10)

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const transactions = await db.transaction.findMany({
    where: {
      familyId: user.family.id,
      transactionDate: { gte: start, lt: end },
    },
    include: {
      category: true,
      responsible: { select: { name: true } },
      account: { select: { name: true } },
      card: { select: { name: true } },
    },
    orderBy: { transactionDate: "desc" },
  })

  const rows = transactions.map((t) => ({
    Data: new Date(t.transactionDate).toLocaleDateString("pt-BR"),
    Descrição: t.description,
    Tipo: t.type === "INCOME" ? "Receita" : "Despesa",
    Categoria: t.category?.name || "",
    Responsável: t.responsible?.name || "",
    Valor: t.amount.toFixed(2).replace(".", ","),
    Status: t.status === "PAID" ? "Pago" : t.status === "OVERDUE" ? "Vencido" : "Pendente",
    Pagamento: t.paymentMethod || "",
    Conta: t.account?.name || "",
    Cartão: t.card?.name || "",
    "Data Vencimento": t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "",
    "Data Pagamento": t.paidDate ? new Date(t.paidDate).toLocaleDateString("pt-BR") : "",
    Fixa: t.isFixed ? "Sim" : "Não",
    Observações: t.notes || "",
  }))

  if (format === "csv") {
    const headers = Object.keys(rows[0] || { Data: "" })
    const csvLines = [headers.join(";")]
    for (const row of rows) {
      csvLines.push(
        headers.map((h) => `"${String((row as any)[h] || "").replace(/"/g, '""')}"`).join(";")
      )
    }
    const csv = "\uFEFF" + csvLines.join("\n") // BOM para Excel reconhecer UTF-8
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lancamentos_${month}_${year}.csv"`,
      },
    })
  }

  if (format === "excel") {
    // Excel aceita HTML table com extensão .xls
    const headers = Object.keys(rows[0] || { Data: "" })
    let html = "<table border='1'><thead><tr>"
    html += headers.map((h) => `<th>${h}</th>`).join("")
    html += "</tr></thead><tbody>"
    for (const row of rows) {
      html += "<tr>" + headers.map((h) => `<td>${(row as any)[h] || ""}</td>`).join("") + "</tr>"
    }
    html += "</tbody></table>"
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="lancamentos_${month}_${year}.xls"`,
      },
    })
  }

  return NextResponse.json({ error: "Formato inválido" }, { status: 400 })
}
