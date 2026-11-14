"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Search, Pencil, Trash2, Copy, Filter, ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react"
import { formatBRL, formatDateBR, monthName } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"

interface Category { id: string; name: string; type: string; color: string; icon?: string | null }
interface Member { id: string; name: string; avatarColor: string }
interface Account { id: string; name: string }
interface Card_ { id: string; name: string }
interface Transaction {
  id: string
  type: string
  description: string
  amount: number
  transactionDate: string
  dueDate: string | null
  paidDate: string | null
  paymentMethod: string | null
  status: string
  isFixed: boolean
  isVariable: boolean
  recurrence: string | null
  installments: number
  notes: string | null
  categoryId: string | null
  responsibleId: string | null
  accountId: string | null
  cardId: string | null
  category?: Category
  responsible?: Member
}

export function TransactionsView() {
  const { month, year } = useAppStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<Card_[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [filterCategory, setFilterCategory] = useState<string>("ALL")
  const [filterMember, setFilterMember] = useState<string>("ALL")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) })
      if (search) params.set("search", search)
      if (filterType !== "ALL") params.set("type", filterType)
      if (filterStatus !== "ALL") params.set("status", filterStatus)
      if (filterCategory !== "ALL") params.set("categoryId", filterCategory)
      if (filterMember !== "ALL") params.set("memberId", filterMember)

      const [txRes, catRes, memRes, accRes, cardRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch("/api/categories"),
        fetch("/api/members"),
        fetch("/api/accounts"),
        fetch("/api/cards"),
      ])
      const txData = await txRes.json()
      const catData = await catRes.json()
      const memData = await memRes.json()
      const accData = await accRes.json()
      const cardData = await cardRes.json()

      setTransactions(txData.transactions || [])
      setCategories(catData.categories || [])
      setMembers(memData.members || [])
      setAccounts(accData.accounts || [])
      setCards(cardData.cards || [])
    } catch {
      toast.error("Erro ao carregar lançamentos")
    } finally {
      setLoading(false)
    }
  }, [month, year, search, filterType, filterStatus, filterCategory, filterMember])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(values: any) {
    setSaving(true)
    try {
      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar")
        return
      }
      toast.success(editing ? "Lançamento atualizado!" : "Lançamento criado!")
      setDialogOpen(false)
      setEditing(null)
      load()
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/transactions/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || "Erro ao excluir")
        return
      }
      toast.success("Lançamento excluído")
      setDeleteId(null)
      load()
    } catch {
      toast.error("Erro de conexão")
    }
  }

  async function handleDuplicate(tx: Transaction) {
    try {
      const res = await fetch(`/api/transactions/${tx.id}?action=duplicate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao duplicar")
        return
      }
      toast.success("Lançamento duplicado!")
      load()
    } catch {
      toast.error("Erro de conexão")
    }
  }

  async function handleMarkPaid(tx: Transaction) {
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID", paidDate: new Date().toISOString() }),
      })
      if (!res.ok) {
        toast.error("Erro ao marcar como pago")
        return
      }
      toast.success("Marcado como pago")
      load()
    } catch {
      toast.error("Erro de conexão")
    }
  }

  // Totais
  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Lançamentos"
        subtitle={`${monthName(month)} de ${year}`}
        action={
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo lançamento
          </Button>
        }
      />

      {/* Totais */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Receitas</div>
              <div className="text-xl font-bold text-emerald-600">{formatBRL(totalIncome)}</div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Despesas</div>
              <div className="text-xl font-bold text-red-600">{formatBRL(totalExpense)}</div>
            </div>
            <ArrowDownRight className="h-5 w-5 text-red-500" />
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Saldo</div>
              <div className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatBRL(totalIncome - totalExpense)}
              </div>
            </div>
            <Receipt className="h-5 w-5 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                <SelectItem value="INCOME">Receitas</SelectItem>
                <SelectItem value="EXPENSE">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="OVERDUE">Vencido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">Todas as categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Integrante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhum lançamento encontrado"
              description="Cadastre uma receita ou despesa, ou ajuste os filtros."
              action={
                <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" /> Novo lançamento
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/30">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${t.category?.color || "#64748b"}22` }}
                  >
                    {t.type === "INCOME" ? (
                      <ArrowUpRight className="h-4.5 w-4.5 text-emerald-600" style={{ width: "1.125rem", height: "1.125rem" }} />
                    ) : (
                      <ArrowDownRight className="h-4.5 w-4.5 text-red-600" style={{ width: "1.125rem", height: "1.125rem" }} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{t.description}</span>
                      {t.isFixed && <Badge variant="outline" className="text-xs">Fixa</Badge>}
                      {t.installments > 1 && <Badge variant="outline" className="text-xs">{t.installments}x</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>{formatDateBR(t.transactionDate)}</span>
                      <span>·</span>
                      <span style={{ color: t.category?.color }}>{t.category?.name || "Sem categoria"}</span>
                      <span>·</span>
                      <span>{t.responsible?.name || "—"}</span>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        t.status === "PAID" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                        t.status === "OVERDUE" ? "border-red-200 text-red-700 bg-red-50" :
                        "border-amber-200 text-amber-700 bg-amber-50"
                      }`}
                    >
                      {t.status === "PAID" ? "Pago" : t.status === "OVERDUE" ? "Vencido" : "Pendente"}
                    </Badge>
                    {t.status !== "PAID" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleMarkPaid(t)}
                      >
                        Marcar pago
                      </Button>
                    )}
                  </div>

                  <div className="text-right shrink-0 min-w-[100px]">
                    <div className={`text-sm font-semibold ${t.type === "INCOME" ? "text-emerald-600" : "text-foreground"}`}>
                      {t.type === "INCOME" ? "+" : "−"} {formatBRL(t.amount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDuplicate(t)}
                      title="Duplicar"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditing(t); setDialogOpen(true) }}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteId(t.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de formulário */}
      <TransactionForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categories={categories}
        members={members}
        accounts={accounts}
        cards={cards}
        onSave={handleSave}
        saving={saving}
        defaultDate={`${year}-${String(month).padStart(2, "0")}-01`}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TransactionForm({
  open,
  onOpenChange,
  editing,
  categories,
  members,
  accounts,
  cards,
  onSave,
  saving,
  defaultDate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Transaction | null
  categories: Category[]
  members: Member[]
  accounts: Account[]
  cards: Card_[]
  onSave: (values: any) => void
  saving: boolean
  defaultDate: string
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [transactionDate, setTransactionDate] = useState(defaultDate)
  const [dueDate, setDueDate] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [responsibleId, setResponsibleId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [accountId, setAccountId] = useState("")
  const [cardId, setCardId] = useState("")
  const [status, setStatus] = useState("PENDING")
  const [isFixed, setIsFixed] = useState(false)
  const [recurrence, setRecurrence] = useState("NONE")
  const [installments, setInstallments] = useState(1)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (editing) {
      setType(editing.type as any)
      setDescription(editing.description)
      setAmount(String(editing.amount))
      setTransactionDate(editing.transactionDate.split("T")[0])
      setDueDate(editing.dueDate ? editing.dueDate.split("T")[0] : "")
      setCategoryId(editing.categoryId || "")
      setResponsibleId(editing.responsibleId || "")
      setPaymentMethod(editing.paymentMethod || "")
      setAccountId(editing.accountId || "")
      setCardId(editing.cardId || "")
      setStatus(editing.status)
      setIsFixed(editing.isFixed)
      setRecurrence(editing.recurrence || "NONE")
      setInstallments(editing.installments)
      setNotes(editing.notes || "")
    } else {
      setType("EXPENSE")
      setDescription("")
      setAmount("")
      setTransactionDate(defaultDate)
      setDueDate("")
      setCategoryId("")
      setResponsibleId("")
      setPaymentMethod("")
      setAccountId("")
      setCardId("")
      setStatus("PENDING")
      setIsFixed(false)
      setRecurrence("NONE")
      setInstallments(1)
      setNotes("")
    }
  }, [editing, defaultDate, open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !amount) {
      toast.error("Preencha descrição e valor")
      return
    }
    const amt = parseFloat(amount.replace(",", "."))
    if (isNaN(amt) || amt <= 0) {
      toast.error("Valor inválido")
      return
    }
    onSave({
      type,
      description: description.trim(),
      amount: amt,
      transactionDate,
      dueDate: dueDate || null,
      categoryId: categoryId || null,
      responsibleId: responsibleId || null,
      paymentMethod: paymentMethod || null,
      accountId: accountId || null,
      cardId: cardId || null,
      status,
      isFixed,
      isVariable: !isFixed,
      recurrence: recurrence === "NONE" ? null : recurrence,
      installments,
      notes: notes || null,
      paidDate: status === "PAID" ? new Date().toISOString() : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription>
            {editing ? "Atualize os campos abaixo." : "Registre uma nova receita ou despesa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                type === "EXPENSE"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-border bg-background hover:bg-muted/50"
              }`}
            >
              <ArrowDownRight className="h-4 w-4" />
              <span className="font-medium text-sm">Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                type === "INCOME"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-border bg-background hover:bg-muted/50"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span className="font-medium text-sm">Receita</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                placeholder="Ex: Supermercado mensal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Data da movimentação *</Label>
              <Input
                id="transactionDate"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {categories.filter((c) => c.type === type).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Integrante responsável</Label>
              <Select value={responsibleId} onValueChange={setResponsibleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">Pix</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="DEBIT">Débito</SelectItem>
                  <SelectItem value="CREDIT">Crédito</SelectItem>
                  <SelectItem value="TRANSFER">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conta bancária</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cartão</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="isFixed" className="font-medium">Despesa fixa</Label>
                <p className="text-xs text-muted-foreground">Marque para despesas recorrentes</p>
              </div>
              <Switch id="isFixed" checked={isFixed} onCheckedChange={setIsFixed} />
            </div>
            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sem recorrência</SelectItem>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "EXPENSE" && (
            <div className="space-y-2">
              <Label htmlFor="installments">Número de parcelas</Label>
              <Input
                id="installments"
                type="number"
                min={1}
                value={installments}
                onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground">
                Use 1 para pagamento à vista. Para parcelamento no cartão, use o módulo de Cartões.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
