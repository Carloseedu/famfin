"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Plus, Target, Pencil, Trash2, CheckCircle2, Flag } from "lucide-react"
import { formatBRL, formatDateBR } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"

interface Member { id: string; name: string }
interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  notes: string | null
  color: string
  percent: number
  responsible?: Member | null
}

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [goalRes, memRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/members"),
      ])
      const goalData = await goalRes.json()
      const memData = await memRes.json()
      setGoals(goalData.goals || [])
      setMembers(memData.members || [])
    } catch {
      toast.error("Erro ao carregar metas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(values: any) {
    setSaving(true)
    try {
      const url = editing ? `/api/goals/${editing.id}` : "/api/goals"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao salvar"); return }
      toast.success(editing ? "Meta atualizada!" : "Meta criada!")
      setDialogOpen(false)
      setEditing(null)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setSaving(false) }
  }

  async function handleAddProgress(goal: Goal, amount: number) {
    try {
      const newAmount = goal.currentAmount + amount
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: newAmount }),
      })
      if (!res.ok) { toast.error("Erro ao atualizar"); return }
      toast.success(`+${formatBRL(amount)} adicionados à meta!`)
      load()
    } catch { toast.error("Erro de conexão") }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/goals/${deleteId}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Erro ao excluir"); return }
      toast.success("Meta excluída")
      setDeleteId(null)
      load()
    } catch { toast.error("Erro de conexão") }
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Metas financeiras"
        subtitle="Objetivos familiares e progresso visual"
        action={
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Nova meta
          </Button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta cadastrada"
          description="Crie metas familiares como reserva de emergência, viagem ou compra."
          action={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-2" /> Criar meta</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const completed = g.percent >= 100
            return (
              <Card key={g.id} className={`card-hover overflow-hidden ${completed ? "ring-2 ring-emerald-500" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${g.color}22`, color: g.color }}
                      >
                        {completed ? <CheckCircle2 className="h-5 w-5" /> : <Flag className="h-4 w-4" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{g.name}</CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {g.responsible?.name ? `Responsável: ${g.responsible.name}` : ""}
                          {g.targetDate ? ` · Até ${formatDateBR(g.targetDate)}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(g); setDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleteId(g.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Atual</div>
                      <div className="text-lg font-bold" style={{ color: g.color }}>
                        {formatBRL(g.currentAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Meta</div>
                      <div className="text-lg font-bold">{formatBRL(g.targetAmount)}</div>
                    </div>
                  </div>
                  <Progress value={Math.min(g.percent, 100)} className="h-2.5" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{g.percent.toFixed(1)}%</span>
                    <span className="text-muted-foreground">
                      {completed ? "Concluída!" : `Faltam ${formatBRL(g.targetAmount - g.currentAmount)}`}
                    </span>
                  </div>
                  {g.notes && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      {g.notes}
                    </div>
                  )}
                  {!completed && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleAddProgress(g, 100)}>
                        + R$ 100
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleAddProgress(g, 500)}>
                        + R$ 500
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <GoalForm
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null) }}
        editing={editing}
        members={members}
        onSave={handleSave}
        saving={saving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function GoalForm({
  open, onOpenChange, editing, members, onSave, saving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Goal | null
  members: Member[]
  onSave: (v: any) => void
  saving: boolean
}) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("0")
  const [targetDate, setTargetDate] = useState("")
  const [notes, setNotes] = useState("")
  const [color, setColor] = useState("#1e3a8a")
  const [responsibleId, setResponsibleId] = useState("")

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setTargetAmount(String(editing.targetAmount))
      setCurrentAmount(String(editing.currentAmount))
      setTargetDate(editing.targetDate ? editing.targetDate.split("T")[0] : "")
      setNotes(editing.notes || "")
      setColor(editing.color)
      setResponsibleId(editing.responsible?.id || "")
    } else {
      setName(""); setTargetAmount(""); setCurrentAmount("0")
      setTargetDate(""); setNotes(""); setColor("#1e3a8a"); setResponsibleId("")
    }
  }, [editing, open])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const target = parseFloat(targetAmount.replace(",", "."))
    const current = parseFloat(currentAmount.replace(",", ".")) || 0
    if (!name.trim() || isNaN(target) || target <= 0) {
      toast.error("Preencha nome e valor da meta")
      return
    }
    onSave({
      name: name.trim(),
      targetAmount: target,
      currentAmount: current,
      targetDate: targetDate || null,
      notes: notes || null,
      color,
      responsibleId: responsibleId || null,
    })
  }

  const colors = ["#1e3a8a", "#0f766e", "#7c2d12", "#9d174d", "#155e75", "#9333ea", "#ea580c"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>Defina um objetivo financeiro familiar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gname">Nome da meta *</Label>
            <Input id="gname" placeholder="Ex: Reserva de emergência" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gtarget">Valor desejado (R$) *</Label>
              <Input id="gtarget" type="text" inputMode="decimal" placeholder="10000,00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gcurrent">Já economizado (R$)</Label>
              <Input id="gcurrent" type="text" inputMode="decimal" placeholder="0,00" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gdate">Prazo</Label>
              <Input id="gdate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-8 w-8 rounded-full ring-2 transition ${color === c ? "ring-offset-2 ring-foreground" : "ring-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gnotes">Observações</Label>
            <Textarea id="gnotes" placeholder="Notas sobre a meta..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar meta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
