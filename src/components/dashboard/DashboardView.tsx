"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Clock, CreditCard, PiggyBank, AlertTriangle, CalendarClock, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { formatBRL, formatDateBR, monthName } from "@/lib/format"
import { EmptyState, LoadingState } from "@/components/common/States"
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ComposedChart } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Receipt } from "lucide-react"

interface DashboardData {
  month: number
  year: number
  cards: {
    totalIncome: number
    totalExpense: number
    balance: number
    pendingCount: number
    pendingAmount: number
    cardTotal: number
    availableAfterCommitments: number
    overdueCount: number
    overdueAmount: number
  }
  charts: {
    expensesByCategory: { name: string; value: number; color: string }[]
    expensesByMember: { name: string; value: number; color: string }[]
    incomeByMember: { name: string; value: number; color: string }[]
    evolution: { month: string; receitas: number; despesas: number; saldo: number }[]
    comparison: {
      current: { income: number; expense: number; balance: number }
      previous: { income: number; expense: number; balance: number }
    }
  }
  indicators: {
    upcoming: any[]
    overdue: any[]
    budgetAlerts: any[]
  }
  recent: any[]
}

export function DashboardView() {
  const { month, year } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [month, year])

  if (loading) return <LoadingState message="Carregando dashboard..." />
  if (!data) {
    return (
      <EmptyState
        icon={Receipt}
        title="Não foi possível carregar o dashboard"
        description="Tente novamente em instantes."
      />
    )
  }

  const c = data.cards
  const chart = data.charts

  return (
    <div className="space-y-6">
      {/* Indicadores críticos */}
      {(data.indicators.overdue.length > 0 || data.indicators.budgetAlerts.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.indicators.overdue.length > 0 && (
            <AlertCard
              type="danger"
              icon={AlertTriangle}
              title={`${data.indicators.overdue.length} conta(s) atrasada(s)`}
              value={formatBRL(data.cards.overdueAmount)}
              hint="Quite essas contas para evitar encargos."
            />
          )}
          {data.indicators.upcoming.length > 0 && (
            <AlertCard
              type="warning"
              icon={CalendarClock}
              title={`${data.indicators.upcoming.length} conta(s) vencendo em 7 dias`}
              value={`${formatBRL(data.indicators.upcoming.reduce((s, t) => s + t.amount, 0))}`}
              hint="Planeje o pagamento das próximas contas."
            />
          )}
          {data.indicators.budgetAlerts.filter((b) => b.exceeded).length > 0 && (
            <AlertCard
              type="danger"
              icon={TrendingDown}
              title={`${data.indicators.budgetAlerts.filter((b) => b.exceeded).length} categoria(s) acima do orçamento`}
              value={data.indicators.budgetAlerts
                .filter((b) => b.exceeded)
                .map((b) => b.category)
                .join(", ")}
              hint="Revise os gastos nestas categorias."
            />
          )}
        </div>
      )}

      {/* Cards financeiros principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FinanceCard
          title="Receitas do mês"
          value={formatBRL(c.totalIncome)}
          icon={TrendingUp}
          color="emerald"
          trend={chart.comparison.current.income > chart.comparison.previous.income ? "up" : chart.comparison.current.income < chart.comparison.previous.income ? "down" : "neutral"}
          trendValue={`Mês anterior: ${formatBRL(chart.comparison.previous.income)}`}
        />
        <FinanceCard
          title="Despesas do mês"
          value={formatBRL(c.totalExpense)}
          icon={TrendingDown}
          color="red"
          trend={chart.comparison.current.expense < chart.comparison.previous.expense ? "up" : chart.comparison.current.expense > chart.comparison.previous.expense ? "down" : "neutral"}
          trendValue={`Mês anterior: ${formatBRL(chart.comparison.previous.expense)}`}
        />
        <FinanceCard
          title="Saldo do mês"
          value={formatBRL(c.balance)}
          icon={Wallet}
          color={c.balance >= 0 ? "blue" : "red"}
          trend={c.balance >= 0 ? "up" : "down"}
          trendValue={`Mês anterior: ${formatBRL(chart.comparison.previous.balance)}`}
        />
        <FinanceCard
          title="Contas pendentes"
          value={String(c.pendingCount)}
          subtitle={formatBRL(c.pendingAmount)}
          icon={Clock}
          color="amber"
        />
        <FinanceCard
          title="Faturas de cartão"
          value={formatBRL(c.cardTotal)}
          icon={CreditCard}
          color="indigo"
        />
        <FinanceCard
          title="Saldo após compromissos"
          value={formatBRL(c.availableAfterCommitments)}
          icon={PiggyBank}
          color={c.availableAfterCommitments >= 0 ? "emerald" : "red"}
        />
      </div>

      {/* Gráficos principais */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Despesas por categoria */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {chart.expensesByCategory.length === 0 ? (
              <EmptyState icon={PieChart} title="Sem despesas no período" className="py-8" />
            ) : (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chart.expensesByCategory.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chart.expensesByCategory.slice(0, 8).map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatBRL(value)}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {chart.expensesByCategory.slice(0, 6).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className="font-medium">{formatBRL(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receitas vs Despesas (comparação) */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-base">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  { name: "Mês anterior", Receitas: chart.comparison.previous.income, Despesas: chart.comparison.previous.expense },
                  { name: "Mês atual", Receitas: chart.comparison.current.income, Despesas: chart.comparison.current.expense },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(value: any) => formatBRL(value)} contentStyle={{ borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por integrante */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-base">Despesas por integrante</CardTitle>
          </CardHeader>
          <CardContent>
            {chart.expensesByMember.length === 0 ? (
              <EmptyState icon={PieChart} title="Sem despesas no período" className="py-8" />
            ) : (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={chart.expensesByMember}
                    layout="vertical"
                    margin={{ left: 0, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(value: any) => formatBRL(value)} contentStyle={{ borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {chart.expensesByMember.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {chart.expensesByMember.slice(0, 4).map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="truncate">{m.name}</span>
                      <span className="font-medium">{formatBRL(m.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolução 6 meses */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-base">Evolução dos últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chart.evolution}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(value: any) => formatBRL(value)} contentStyle={{ borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
              <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
              <Line type="monotone" dataKey="saldo" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 4 }} name="Saldo" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Movimentações recentes */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Movimentações recentes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => useAppStore.getState().setView("transactions")}>
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <EmptyState icon={Receipt} title="Sem movimentações" description="Cadastre sua primeira receita ou despesa." />
          ) : (
            <div className="divide-y divide-border">
              {data.recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${t.category?.color || "#64748b"}22` }}
                  >
                    {t.type === "INCOME" ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateBR(t.transactionDate)} · {t.category?.name || "Sem categoria"} · {t.responsible?.name || "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-semibold ${t.type === "INCOME" ? "text-emerald-600" : "text-foreground"}`}>
                      {t.type === "INCOME" ? "+" : "−"} {formatBRL(t.amount)}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs mt-0.5 ${
                        t.status === "PAID" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                        t.status === "OVERDUE" ? "border-red-200 text-red-700 bg-red-50" :
                        "border-amber-200 text-amber-700 bg-amber-50"
                      }`}
                    >
                      {t.status === "PAID" ? "Pago" : t.status === "OVERDUE" ? "Vencido" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FinanceCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  trendValue,
}: {
  title: string
  value: string
  subtitle?: string
  icon: any
  color: "emerald" | "red" | "blue" | "amber" | "indigo"
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
  }
  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-600",
    neutral: "text-muted-foreground",
  }

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon className="h-4.5 w-4.5" style={{ width: "1.125rem", height: "1.125rem" }} />
          </div>
          {trend && (
            <span className={`text-xs ${trendColors[trend]}`}>
              {trend === "up" ? "▲" : trend === "down" ? "▼" : "■"}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{title}</div>
        <div className="text-xl font-bold tracking-tight truncate">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
        {trendValue && <div className="text-xs text-muted-foreground mt-0.5 truncate">{trendValue}</div>}
      </CardContent>
    </Card>
  )
}

function AlertCard({
  type,
  icon: Icon,
  title,
  value,
  hint,
}: {
  type: "warning" | "danger"
  icon: any
  title: string
  value: string
  hint: string
}) {
  const styles = {
    danger: "bg-red-50 border-red-200 text-red-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
  }
  return (
    <div className={`rounded-xl border p-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-lg font-bold truncate">{value}</div>
          <div className="text-xs opacity-80 mt-0.5">{hint}</div>
        </div>
      </div>
    </div>
  )
}
