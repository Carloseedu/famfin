"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Receipt, AlertTriangle, CalendarClock, RefreshCw, Trash2, CheckCircle2 } from "lucide-react"
import { formatBRL, formatDateBR, monthName } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"

interface Category { id: string; name: string; color: string }
interface Member { id: string; name: string }
interface RecurringBill {
  id: string
  description: string
  expectedAmount: number
  dueDay: number
  frequency: string
  startDate: string
  endDate: string | null
  lastGenerated: string | null
  isActive: boolean
  categoryId: string | null
  responsibleId: string | null
  category?: Category
  responsible?: Member
}

interface Transaction {
  id: string
  description: string
  amount: number
  transactionDate: string
  dueDate: string | null
  status: string
  type: string
  category?: Category
  responsible?: Member
}

export function BillsView() {
  const { month, year } = useAppStore()
  const [tab, setTab] = useState("pending")
  const [recurring, setRecurring] = useState<RecurringBill[]>([])
  const [pending, setPending] = useState<Transaction[]>([])
  const [overdue, setOverdue] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [recRes, txRes, catRes, memRes] = await Promise.all([
        fetch("/api/recurring"),
        fetch(`/api/transactions?month=${month}&year=${year}`),
        fetch("/api/categories"),
        fetch("/api/members"),
      ])
      const recData = await recRes.json()
      const txData = await txRes.json()
      const catData = await catRes.json()
      const memData = await memRes.json()

      setRecurring(recData.recurring || [])
      setCategories(catData.categories || [])
      setMembers(memData.members || [])

      const txs = txData.transactions || []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      setPending(txs.filter((t: Transaction) => t.status !== "PAID" && (!t.dueDate || new Date(t.dueDate) >= today)))
      setOverdue(txs.filter((t: Transaction) => t.status !== "PAID" && t.dueDate && new Date(t.dueDate) < today))
    } catch {
      toast.error("Erro ao carregar contas")
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  async function handleMarkPaid(tx: Transaction) {
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

  async function handleGenerate(bill: RecurringBill) {
    try {
      const res = await fetch(`/api/recurring/${bill.id}?action=generate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) { toast.error("Erro ao gerar"); return }
      toast.success(data.message || "Lançamento gerado")
      load()
    } catch { toast.error("Erro de conexão") }
  }

  async function handleDeleteRecurring(bill: RecurringBill) {
    if (!confirm(`Desativar a conta recorrente "${bill.description}"?`)) return
    try {
      const res = await fetch(`/api/recurring/${bill.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Erro ao desativar"); return }
      toast.success("Conta recorrente desativada")
      load()
    } catch { toast.error("Erro de conexão") }
  }

  async function handleSave(values: any) {
    setSaving(true)
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao salvar"); return }
      toast.success("Conta recorrente criada")
      setDialogOpen(false)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setSaving(false) }
  }

  const totalPending = pending.reduce((s, t) => s + t.amount, 0)
  const totalOverdue = overdue.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Contas a pagar"
        subtitle={`${monthName(month)} de ${year}`}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova conta recorrente
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">A pagar (pendentes)</div>
            <div className="text-xl font-bold text-amber-600">{formatBRL(totalPending)}</div>
            <div className="text-xs text-muted-foreground mt-1">{pending.length} conta(s)</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Atrasadas</div>
            <div className="text-xl font-bold text-red-600">{formatBRL(totalOverdue)}</div>
            <div className="text-xs text-muted-foreground mt-1">{overdue.length} conta(s)</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Contas recorrentes ativas</div>
            <div className="text-xl font-bold text-blue-600">{recurring.length}</div>
            <div className="text-xs text-muted-foreground mt-1">configurada(s)</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pendentes ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Atrasadas ({overdue.length})
          </TabsTrigger>
          <TabsTrigger value="recurring">
            Recorrentes ({recurring.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? <LoadingState /> :
                pending.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title="Nenhuma conta pendente" description="Todas as contas do mês estão pagas." />
                ) : (
                  <div className="divide-y divide-border">
                    {pending.map((t) => (
                      <BillRow key={t.id} tx={t} onMarkPaid={() => handleMarkPaid(t)} />
                    ))}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? <LoadingState /> :
                overdue.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title="Nenhuma conta atrasada" description="Parabéns! Todas as contas estão em dia." />
                ) : (
                  <div className="divide-y divide-border">
                    {overdue.map((t) => (
                      <BillRow key={t.id} tx={t} onMarkPaid={() => handleMarkPaid(t)} overdue />
                    ))}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? <LoadingState /> :
                recurring.length === 0 ? (
                  <EmptyState
                    icon={RefreshCw}
                    title="Nenhuma conta recorrente"
                    description="Cadastre suas contas fixas para gerar lançamentos automaticamente."
                    action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova conta recorrente</Button>}
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {recurring.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 p-4">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-50">
                          <RefreshCw className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{b.description}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>Venc. dia {b.dueDay}</span>
                            <span>·</span>
                            <span>{b.category?.name || "—"}</span>
                            <span>·</span>
                            <span>{b.responsible?.name || "—"}</span>
                            <Badge variant="outline" className="text-xs">{b.frequency}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatBRL(b.expectedAmount)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleGenerate(b)}>
                            Gerar
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDeleteRecurring(b)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RecurringForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories.filter((c) => c.type === "EXPENSE" || (c as any).type === "EXPENSE")}
        members={members}
        onSave={handleSave}
        saving={saving}
        defaultDate={`${year}-${String(month).padStart(2, "0")}-01`}
      />
    </div>
  )
}

function BillRow({ tx, onMarkPaid, overdue }: { tx: Transaction; onMarkPaid: () => void; overdue?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${overdue ? "bg-red-50" : "bg-amber-50"}`}>
        {overdue ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <CalendarClock className="h-4 w-4 text-amber-600" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{tx.description}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
          <span style={{ color: tx.category?.color }}>{tx.category?.name || "—"}</span>
          <span>·</span>
          <span>Venc: {tx.dueDate ? formatDateBR(tx.dueDate) : "—"}</span>
          <span>·</span>
          <span>{tx.responsible?.name || "—"}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">{formatBRL(tx.amount)}</div>
      </div>
      <Button size="sm" variant="outline" onClick={onMarkPaid}>
        Marcar pago
      </Button>
    </div>
  )
}

function RecurringForm({
  open, onOpenChange, categories, members, onSave, saving, defaultDate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: Category[]
  members: Member[]
  onSave: (v: any) => void
  saving: boolean
  defaultDate: string
}) {
  const [description, setDescription] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [dueDay, setDueDay] = useState("10")
  const [frequency, setFrequency] = useState("MONTHLY")
  const [startDate, setStartDate] = useState(defaultDate)
  const [categoryId, setCategoryId] = useState("")
  const [responsibleId, setResponsibleId] = useState("")

  useEffect(() => {
    if (open) {
      setDescription("")
      setExpectedAmount("")
      setDueDay("10")
      setFrequency("MONTHLY")
      setStartDate(defaultDate)
      setCategoryId("")
      setResponsibleId("")
    }
  }, [open, defaultDate])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(expectedAmount.replace(",", "."))
    if (!description.trim() || isNaN(amt) || amt <= 0) {
      toast.error("Preencha descrição e valor")
      return
    }
    onSave({
      description: description.trim(),
      expectedAmount: amt,
      dueDay: parseInt(dueDay, 10),
      frequency,
      startDate,
      categoryId: categoryId || null,
      responsibleId: responsibleId || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova conta recorrente</DialogTitle>
          <DialogDescription>Cadastre contas fixas para gerar lançamentos mensais automaticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição *</Label>
            <Input id="desc" placeholder="Ex: Internet" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amt">Valor previsto (R$) *</Label>
              <Input id="amt" type="text" inputMode="decimal" placeholder="0,00" value={expectedAmount} onChange={(e) => setExpectedAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDay">Dia do vencimento *</Label>
              <Input id="dueDay" type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de início *</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={responsibleId} onValueChange={setResponsibleId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar recorrente"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
