"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, FileSpreadsheet, TrendingDown, TrendingUp, PieChart, BarChart3, Users, CreditCard, Calendar } from "lucide-react"
import { formatBRL, monthName } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { ResponsiveContainer, PieChart as RPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts"

export function ReportsView() {
  const { month, year } = useAppStore()
  const [reportType, setReportType] = useState("summary")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [evolution, setEvolution] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=${reportType}&month=${month}&year=${year}`)
      const d = await res.json()
      setData(d)

      // Evolução dos últimos 12 meses
      const evo: any[] = []
      for (let i = 11; i >= 0; i--) {
        const m = month - 1 - i
        const y = year + Math.floor(m / 12)
        const mm = ((m % 12) + 12) % 12
        const start = new Date(y, mm, 1)
        const end = new Date(y, mm + 1, 1)
        const r = await fetch(`/api/reports?type=summary&month=${mm + 1}&year=${y}`)
        const rd = await r.json()
        const inc = rd.totals?.income || 0
        const exp = rd.totals?.expense || 0
        evo.push({
          month: start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          receitas: inc,
          despesas: exp,
          saldo: inc - exp,
        })
      }
      setEvolution(evo)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [reportType, month, year])

  useEffect(() => { load() }, [load])

  function handleExport(format: "csv" | "excel") {
    window.open(`/api/export?format=${format}&month=${month}&year=${year}`, "_blank")
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Relatórios"
        subtitle={`${monthName(month)} de ${year}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport("excel")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
          </div>
        }
      />

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="transactions">Lançamentos</TabsTrigger>
          <TabsTrigger value="upcoming_installments">Parcelamentos</TabsTrigger>
          <TabsTrigger value="evolution" disabled>Evolução</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-4">
          {loading ? <LoadingState /> : !data || !data.totals ? (
            <EmptyState icon={PieChart} title="Sem dados" />
          ) : (
            <>
              {/* Totais */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Receitas" value={formatBRL(data.totals.income)} icon={TrendingUp} color="emerald" />
                <StatCard title="Despesas" value={formatBRL(data.totals.expense)} icon={TrendingDown} color="red" />
                <StatCard title="Saldo" value={formatBRL(data.totals.income - data.totals.expense)} icon={Calendar} color="blue" />
                <StatCard title="No cartão" value={formatBRL(data.totals.card)} icon={CreditCard} color="indigo" />
                <StatCard title="Fixas" value={formatBRL(data.totals.fixed)} icon={BarChart3} color="amber" />
                <StatCard title="Variáveis" value={formatBRL(data.totals.variable)} icon={BarChart3} color="purple" />
                <StatCard title="Pagas" value={formatBRL(data.totals.paid)} icon={TrendingUp} color="emerald" />
                <StatCard title="Pendentes" value={formatBRL(data.totals.pending)} icon={Calendar} color="amber" />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Despesas por categoria */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Despesas por categoria</CardTitle></CardHeader>
                  <CardContent>
                    {data.byCategory.length === 0 ? (
                      <EmptyState icon={PieChart} title="Sem dados" className="py-6" />
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.byCategory.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                          <Tooltip formatter={(value: any) => formatBRL(value)} contentStyle={{ borderRadius: 8 }} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {data.byCategory.slice(0, 8).map((entry: any, idx: number) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Despesas por integrante */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Despesas por integrante</CardTitle></CardHeader>
                  <CardContent>
                    {data.byMember.length === 0 ? (
                      <EmptyState icon={Users} title="Sem dados" className="py-6" />
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <RPie>
                          <Pie
                            data={data.byMember}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            dataKey="value"
                            label={(entry: any) => `${entry.name}`}
                            labelLine={false}
                          >
                            {data.byMember.map((entry: any, idx: number) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatBRL(value)} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </RPie>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Receitas por integrante */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Receitas por integrante</CardTitle></CardHeader>
                  <CardContent>
                    {data.incomeByMember.length === 0 ? (
                      <EmptyState icon={Users} title="Sem receitas" className="py-6" />
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.incomeByMember}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                          <Tooltip formatter={(value: any) => formatBRL(value)} contentStyle={{ borderRadius: 8 }} />
                          <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Fixas vs Variáveis */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Fixas vs Variáveis</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={[
                          { name: "Fixas", value: data.totals.fixed },
                          { name: "Variáveis", value: data.totals.variable },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={(value: any) => formatBRL(value)} contentStyle={{ borderRadius: 8 }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          <Cell fill="#f59e0b" />
                          <Cell fill="#8b5cf6" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Evolução 12 meses */}
              <Card>
                <CardHeader><CardTitle className="text-base">Evolução dos últimos 12 meses</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={evolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip formatter={(value: any) => formatBRL(value)} contentStyle={{ borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Receitas" />
                      <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Despesas" />
                      <Line type="monotone" dataKey="saldo" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 3 }} name="Saldo" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? <LoadingState /> : !data || !data.transactions || data.transactions.length === 0 ? (
                <EmptyState icon={Calendar} title="Sem lançamentos no período" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.transactions.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">{t.data}</TableCell>
                          <TableCell className="text-sm font-medium">{t.descricao}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${t.tipo === "Receita" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                              {t.tipo}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{t.categoria}</TableCell>
                          <TableCell className="text-sm">{t.responsavel}</TableCell>
                          <TableCell className={`text-sm font-medium text-right ${t.tipo === "Receita" ? "text-emerald-600" : ""}`}>
                            {t.tipo === "Receita" ? "+" : "−"} {formatBRL(t.valor)}
                          </TableCell>
                          <TableCell className="text-sm">{t.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming_installments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? <LoadingState /> : !data || !data.purchases || data.purchases.length === 0 ? (
                <EmptyState icon={CreditCard} title="Nenhuma compra parcelada" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Compra</TableHead>
                        <TableHead>Cartão</TableHead>
                        <TableHead className="text-right">Parcelas</TableHead>
                        <TableHead className="text-right">Valor parcela</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.purchases.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm font-medium">{p.descricao}</TableCell>
                          <TableCell className="text-sm">{p.cartao}</TableCell>
                          <TableCell className="text-sm text-right">{p.parcelas}x</TableCell>
                          <TableCell className="text-sm text-right">{formatBRL(p.valorParcela)}</TableCell>
                          <TableCell className="text-sm font-medium text-right">{formatBRL(p.total)}</TableCell>
                          <TableCell className="text-sm">{p.dataCompra}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
  }
  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground truncate">{title}</div>
            <div className="text-lg font-bold truncate">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
