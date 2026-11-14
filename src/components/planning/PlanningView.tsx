"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Plus, Target, Trash2, AlertTriangle } from "lucide-react"
import { formatBRL, monthName } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"

interface Category { id: string; name: string; color: string }
interface Budget {
  id: string
  month: number
  year: number
  limit: number
  spent: number
  remaining: number
  percentUsed: number
  category: Category
}

export function PlanningView() {
  const { month, year, user } = useAppStore()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [budRes, catRes] = await Promise.all([
        fetch(`/api/budgets?month=${month}&year=${year}`),
        fetch("/api/categories"),
      ])
      const budData = await budRes.json()
      const catData = await catRes.json()
      setBudgets(budData.budgets || [])
      setCategories((catData.categories || []).filter((c: Category) => (c as any).type === "EXPENSE"))
    } catch {
      toast.error("Erro ao carregar orçamento")
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  async function handleSave(values: any) {
    setSaving(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, month, year }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao salvar"); return }
      toast.success("Orçamento salvo!")
      setDialogOpen(false)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setSaving(false) }
  }

  async function handleDelete(b: Budget) {
    if (!confirm(`Remover orçamento de ${b.category.name}?`)) return
    try {
      const res = await fetch(`/api/budgets/${b.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Erro ao excluir"); return }
      toast.success("Orçamento removido")
      load()
    } catch { toast.error("Erro de conexão") }
  }

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const totalRemaining = totalLimit - totalSpent
  const overallPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0

  const isAdmin = user?.role === "ADMIN"
  const availableCategories = categories.filter((c) => !budgets.some((b) => b.categoryId === c.id))

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Planejamento"
        subtitle={`Orçamento mensal — ${monthName(month)} de ${year}`}
        action={
          isAdmin && (
            <Button onClick={() => setDialogOpen(true)} disabled={availableCategories.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Novo orçamento
            </Button>
          )
        }
      />

      {/* Resumo geral */}
      <Card className="card-hover">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-muted-foreground">Orçamento geral do mês</div>
              <div className="text-2xl font-bold">{formatBRL(totalLimit)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Já gastos</div>
              <div className={`text-2xl font-bold ${totalSpent > totalLimit ? "text-red-600" : "text-amber-600"}`}>
                {formatBRL(totalSpent)}
              </div>
            </div>
          </div>
          <Progress value={overallPercent} className="h-3" />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-muted-foreground">{overallPercent.toFixed(1)}% utilizado</span>
            <span className={totalRemaining >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
              {totalRemaining >= 0 ? `Resta ${formatBRL(totalRemaining)}` : `Excedeu ${formatBRL(-totalRemaining)}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhum orçamento definido"
          description="Defina limites de gastos por categoria para acompanhar seus planejamentos."
          action={isAdmin ? <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Definir orçamento</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const exceeded = b.percentUsed >= 100
            const warning = b.percentUsed >= 80 && !exceeded
            return (
              <Card key={b.id} className={`card-hover border-l-4 ${exceeded ? "border-l-red-500" : warning ? "border-l-amber-500" : "border-l-emerald-500"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.category.color }} />
                      <div className="font-medium">{b.category.name}</div>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete(b)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Gasto / Limite</div>
                      <div className="text-lg font-bold">
                        {formatBRL(b.spent)} <span className="text-sm text-muted-foreground font-normal">/ {formatBRL(b.limit)}</span>
                      </div>
                    </div>
                    {exceeded && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Excedeu
                      </Badge>
                    )}
                    {warning && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Atenção
                      </Badge>
                    )}
                  </div>
                  <Progress
                    value={Math.min(b.percentUsed, 100)}
                    className={`h-2 ${exceeded ? "[&>div]:bg-red-500" : warning ? "[&>div]:bg-amber-500" : ""}`}
                  />
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-muted-foreground">{b.percentUsed.toFixed(0)}% usado</span>
                    <span className={b.remaining >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                      {b.remaining >= 0 ? `Resta ${formatBRL(b.remaining)}` : `Excedeu ${formatBRL(-b.remaining)}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <BudgetForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={availableCategories}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}

function BudgetForm({
  open, onOpenChange, categories, onSave, saving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: Category[]
  onSave: (v: any) => void
  saving: boolean
}) {
  const [categoryId, setCategoryId] = useState("")
  const [limit, setLimit] = useState("")

  useEffect(() => {
    if (open) {
      setCategoryId(categories[0]?.id || "")
      setLimit("")
    }
  }, [open, categories])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(limit.replace(",", "."))
    if (!categoryId || isNaN(amt) || amt <= 0) {
      toast.error("Selecione categoria e informe o limite")
      return
    }
    onSave({ categoryId, limit: amt })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definir orçamento</DialogTitle>
          <DialogDescription>Estabeleça um limite de gasto mensal para uma categoria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria *</Label>
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
            <Label htmlFor="limit">Limite mensal (R$) *</Label>
            <Input id="limit" type="text" inputMode="decimal" placeholder="Ex: 1000,00" value={limit} onChange={(e) => setLimit(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
