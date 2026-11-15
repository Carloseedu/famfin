"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Receipt, CalendarClock, CheckCircle2, XCircle, TrendingUp, AlertTriangle } from "lucide-react"
import { formatBRL, formatDateBR, monthName } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"

interface FixedTransaction {
  id: string
  description: string
  amount: number
  transactionDate: string
  dueDate: string | null
  status: string
  isFixed: boolean
  recurrenceGroupId: string | null
  category?: { id: string; name: string; color: string } | null
  responsible?: { id: string; name: string; avatarColor: string } | null
}

export function BillsView() {
  const { month, year } = useAppStore()
  const [fixedThisMonth, setFixedThisMonth] = useState<FixedTransaction[]>([])
  const [fixedUpcoming, setFixedUpcoming] = useState<FixedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelTx, setCancelTx] = useState<FixedTransaction | null>(null)
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Busca TODAS as transações fixas dos próximos 6 meses (incluindo o atual)
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month + 5, 1) // 6 meses à frente (mês atual + 5)

      const res = await fetch(
        `/api/transactions?month=${month}&year=${year}`
      )
      const data = await res.json()
      const allFixed = (data.transactions || []).filter((t: FixedTransaction) => t.isFixed)
      setFixedThisMonth(allFixed)

      // Para as próximas, buscamos mês a mês
      const upcoming: FixedTransaction[] = []
      for (let i = 1; i <= 5; i++) {
        const m = month + i - 1 // 0-indexed
        const y = year + Math.floor(m / 12)
        const mm = (m % 12) + 1
        const r = await fetch(`/api/transactions?month=${mm}&year=${y}`)
        const d = await r.json()
        const fixed = (d.transactions || []).filter((t: FixedTransaction) => t.isFixed)
        upcoming.push(...fixed)
      }
      setFixedUpcoming(upcoming)
    } catch {
      toast.error("Erro ao carregar contas fixas")
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  async function handleMarkPaid(tx: FixedTransaction) {
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID", paidDate: new Date().toISOString() }),
      })
      if (!res.ok) { toast.error("Erro ao marcar"); return }
      toast.success("Conta marcada como paga")
      load()
    } catch { toast.error("Erro de conexão") }
  }

  async function handleCancelFixed() {
    if (!cancelTx) return
    setCanceling(true)
    try {
      const res = await fetch(`/api/transactions/${cancelTx.id}?action=cancelFixedGroup`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao cancelar"); return }
      toast.success(`Conta fixa cancelada! ${data.deletedCount} lançamento(s) futuro(s) excluído(s).`)
      setCancelTx(null)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setCanceling(false) }
  }

  const totalThisMonth = fixedThisMonth.reduce((s, t) => s + t.amount, 0)
  const paidThisMonth = fixedThisMonth.filter((t) => t.status === "PAID")
  const pendingThisMonth = fixedThisMonth.filter((t) => t.status !== "PAID")
  const totalPaid = paidThisMonth.reduce((s, t) => s + t.amount, 0)
  const totalPending = pendingThisMonth.reduce((s, t) => s + t.amount, 0)

  // Agrupar próximas por mês
  const upcomingByMonth: Record<string, FixedTransaction[]> = {}
  for (const tx of fixedUpcoming) {
    const d = new Date(tx.transactionDate)
    const key = `${monthName(d.getMonth() + 1)} ${d.getFullYear()}`
    if (!upcomingByMonth[key]) upcomingByMonth[key] = []
    upcomingByMonth[key].push(tx)
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Contas fixas"
        subtitle={`${monthName(month)} de ${year} — despesas mensais recorrentes`}
      />

      {/* Cards de resumo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total de contas fixas do mês</div>
            <div className="text-xl font-bold text-blue-600">{formatBRL(totalThisMonth)}</div>
            <div className="text-xs text-muted-foreground mt-1">{fixedThisMonth.length} conta(s)</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Já pagas</div>
            <div className="text-xl font-bold text-emerald-600">{formatBRL(totalPaid)}</div>
            <div className="text-xs text-muted-foreground mt-1">{paidThisMonth.length} conta(s)</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pendentes</div>
            <div className="text-xl font-bold text-amber-600">{formatBRL(totalPending)}</div>
            <div className="text-xs text-muted-foreground mt-1">{pendingThisMonth.length} conta(s)</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de contas fixas do mês */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-base">Contas fixas — {monthName(month)} de {year}</h3>
          </div>

          {loading ? (
            <LoadingState />
          ) : fixedThisMonth.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhuma conta fixa neste mês"
              description="Cadastre uma despesa marcando o switch 'Despesa fixa' no módulo Lançamentos. O sistema cria automaticamente 6 meses à frente."
              className="py-6"
            />
          ) : (
            <div className="divide-y divide-border">
              {fixedThisMonth.map((tx) => (
                <FixedRow
                  key={tx.id}
                  tx={tx}
                  onMarkPaid={() => handleMarkPaid(tx)}
                  onCancel={() => setCancelTx(tx)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos meses */}
      {!loading && Object.keys(upcomingByMonth).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-base">Próximos meses (já programadas)</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(upcomingByMonth).map(([monthLabel, transactions]) => (
                <div key={monthLabel}>
                  <div className="text-sm font-medium text-muted-foreground mb-2">{monthLabel}</div>
                  <div className="divide-y divide-border rounded-lg border">
                    {transactions.map((tx) => (
                      <FixedRow
                        key={tx.id}
                        tx={tx}
                        onMarkPaid={() => handleMarkPaid(tx)}
                        onCancel={() => setCancelTx(tx)}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dica de uso */}
      {!loading && fixedThisMonth.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-sm text-blue-900">
            <div className="font-medium mb-1">💡 Como usar contas fixas</div>
            <div className="text-blue-800 text-xs space-y-1">
              <div>1. Vá em <strong>Lançamentos → Novo lançamento</strong></div>
              <div>2. Cadastre uma despesa (ex: "Aluguel", "Internet", "Escola")</div>
              <div>3. Marque o switch <strong>"Despesa fixa"</strong></div>
              <div>4. O sistema cria automaticamente 6 lançamentos (um por mês)</div>
              <div>5. Acompanhe a evolução no dashboard e cancele quando quiser aqui nesta aba</div>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!cancelTx} onOpenChange={(v) => !v && setCancelTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar conta fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTx && (
                <>
                  Todos os lançamentos <strong>futuros não pagos</strong> de
                  &quot;{cancelTx.description}&quot; serão excluídos automaticamente.
                  Lançamentos já pagos ficam como histórico.
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter conta fixa</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelFixed}
              disabled={canceling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {canceling ? "Cancelando..." : "Sim, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FixedRow({
  tx,
  onMarkPaid,
  onCancel,
  compact,
}: {
  tx: FixedTransaction
  onMarkPaid: () => void
  onCancel: () => void
  compact?: boolean
}) {
  const isOverdue = tx.status !== "PAID" && tx.dueDate && new Date(tx.dueDate) < new Date()
  return (
    <div className={`flex items-center gap-3 ${compact ? "p-2.5" : "p-3"}`}>
      <div
        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
          tx.status === "PAID" ? "bg-emerald-50" : isOverdue ? "bg-red-50" : "bg-amber-50"
        }`}
      >
        {tx.status === "PAID" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : isOverdue ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <CalendarClock className="h-4 w-4 text-amber-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{tx.description}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
          <span>Venc: {tx.dueDate ? formatDateBR(tx.dueDate) : "—"}</span>
          <span>·</span>
          <span style={{ color: tx.category?.color }}>{tx.category?.name || "—"}</span>
          {tx.responsible && (
            <>
              <span>·</span>
              <span>{tx.responsible.name}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold">{formatBRL(tx.amount)}</div>
        <Badge
          variant="outline"
          className={`text-xs mt-0.5 ${
            tx.status === "PAID" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
            isOverdue ? "border-red-200 text-red-700 bg-red-50" :
            "border-amber-200 text-amber-700 bg-amber-50"
          }`}
        >
          {tx.status === "PAID" ? "Pago" : isOverdue ? "Vencido" : "Pendente"}
        </Badge>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {tx.status !== "PAID" && (
          <Button size="sm" variant="outline" onClick={onMarkPaid} className="h-7 text-xs">
            Pagar
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-red-600"
          onClick={onCancel}
          title="Cancelar conta fixa (exclui futuros não pagos)"
        >
          <XCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
