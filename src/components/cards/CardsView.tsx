"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, CreditCard, Trash2, ShoppingBag, TrendingUp } from "lucide-react"
import { formatBRL, formatDateBR } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"

interface Category { id: string; name: string; color: string }
interface Member { id: string; name: string; avatarColor: string }
interface CardItem {
  id: string
  name: string
  institution: string | null
  creditLimit: number
  closingDay: number
  dueDay: number
  responsible?: Member | null
  usedAmount: number
  availableLimit: number
  futureCommitments: number
  purchases: Purchase[]
}
interface Purchase {
  id: string
  description: string
  totalAmount: number
  purchaseDate: string
  installments: number
  installmentAmount: number
  category?: Category
}

export function CardsView() {
  const { user } = useAppStore()
  const [cards, setCards] = useState<CardItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const [purchaseCardId, setPurchaseCardId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteType, setDeleteType] = useState<"card" | "purchase" | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cardRes, catRes, memRes] = await Promise.all([
        fetch("/api/cards"),
        fetch("/api/categories"),
        fetch("/api/members"),
      ])
      const cardData = await cardRes.json()
      const catData = await catRes.json()
      const memData = await memRes.json()
      setCards(cardData.cards || [])
      setCategories((catData.categories || []).filter((c: Category) => (c as any).type === "EXPENSE"))
      setMembers(memData.members || [])
    } catch {
      toast.error("Erro ao carregar cartões")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSaveCard(values: any) {
    setSaving(true)
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao salvar"); return }
      toast.success("Cartão cadastrado!")
      setCardDialogOpen(false)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setSaving(false) }
  }

  async function handleSavePurchase(values: any) {
    setSaving(true)
    try {
      const res = await fetch("/api/card-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao salvar"); return }
      toast.success(`Compra registrada! ${data.transactionsCreated} parcela(s) geradas.`)
      setPurchaseDialogOpen(false)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId || !deleteType) return
    const url = deleteType === "card"
      ? `/api/cards/${deleteId}`
      : `/api/card-purchases/${deleteId}`
    try {
      const res = await fetch(url, { method: "DELETE" })
      if (!res.ok) { toast.error("Erro ao excluir"); return }
      toast.success("Excluído com sucesso")
      setDeleteId(null)
      setDeleteType(null)
      load()
    } catch { toast.error("Erro de conexão") }
  }

  const isAdmin = user?.role === "ADMIN"

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Cartões de crédito"
        subtitle="Gerencie cartões, compras parceladas e faturas"
        action={
          isAdmin ? (
            <Button onClick={() => setCardDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Novo cartão
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Cadastre seus cartões de crédito para acompanhar limites e compras parceladas."
          action={isAdmin ? <Button onClick={() => setCardDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo cartão</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map((card) => {
            const usedPercent = card.creditLimit > 0 ? (card.usedAmount / card.creditLimit) * 100 : 0
            return (
              <Card key={card.id} className="card-hover overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-[#1e3a8a] to-[#0f1e3d] text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <CardTitle className="text-base">{card.name}</CardTitle>
                      </div>
                      <div className="text-xs text-white/70 mt-1">
                        {card.institution || "—"} · Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                      </div>
                      <div className="text-xs text-white/70 mt-0.5">
                        Responsável: {card.responsible?.name || "—"}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:bg-white/10"
                        onClick={() => { setDeleteId(card.id); setDeleteType("card") }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Limites */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Utilizado</span>
                      <span className="font-medium">{formatBRL(card.usedAmount)}</span>
                    </div>
                    <Progress value={usedPercent} className="h-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Limite disponível</span>
                      <span className="font-medium text-emerald-600">{formatBRL(card.availableLimit)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Limite total</span>
                      <span className="font-medium">{formatBRL(card.creditLimit)}</span>
                    </div>
                    {card.futureCommitments > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Compromissos futuros</span>
                        <span className="font-medium text-amber-600">{formatBRL(card.futureCommitments)}</span>
                      </div>
                    )}
                  </div>

                  {/* Compras parceladas */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Compras parceladas</div>
                    </div>
                    {card.purchases.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-3 text-center">
                        Nenhuma compra parcelada registrada.
                        <div className="mt-1 text-xs">
                          Para registrar uma compra, vá em <strong>Lançamentos → Novo lançamento</strong>,
                          selecione <strong>Crédito</strong> como forma de pagamento e informe as parcelas.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {card.purchases.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm truncate">{p.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDateBR(p.purchaseDate)} · {p.installments}x de {formatBRL(p.installmentAmount)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{formatBRL(p.totalAmount)}</div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs text-red-600 px-1"
                                  onClick={() => { setDeleteId(p.id); setDeleteType("purchase") }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <CardForm
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        members={members}
        onSave={handleSaveCard}
        saving={saving}
      />

      <PurchaseForm
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        cardId={purchaseCardId}
        cards={cards}
        categories={categories}
        members={members}
        onSave={handleSavePurchase}
        saving={saving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) { setDeleteId(null); setDeleteType(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteType === "card" ? "cartão" : "compra"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "card"
                ? "O cartão será removido. Lançamentos vinculados permanecerão."
                : "A compra e todos os lançamentos das parcelas serão removidos."}
            </AlertDialogDescription>
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

function CardForm({
  open, onOpenChange, members, onSave, saving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  members: Member[]
  onSave: (v: any) => void
  saving: boolean
}) {
  const [name, setName] = useState("")
  const [institution, setInstitution] = useState("")
  const [creditLimit, setCreditLimit] = useState("")
  const [closingDay, setClosingDay] = useState("5")
  const [dueDay, setDueDay] = useState("15")
  const [responsibleId, setResponsibleId] = useState("")

  useEffect(() => {
    if (open) {
      setName(""); setInstitution(""); setCreditLimit("")
      setClosingDay("5"); setDueDay("15"); setResponsibleId("")
    }
  }, [open])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const limit = parseFloat(creditLimit.replace(",", "."))
    if (!name.trim() || isNaN(limit) || limit <= 0) {
      toast.error("Preencha nome e limite")
      return
    }
    onSave({
      name: name.trim(),
      institution: institution || null,
      creditLimit: limit,
      closingDay: parseInt(closingDay, 10),
      dueDay: parseInt(dueDay, 10),
      responsibleId: responsibleId || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo cartão</DialogTitle>
          <DialogDescription>Cadastre um cartão de crédito.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Nome do cartão *</Label>
              <Input id="name" placeholder="Ex: Cartão Nubank" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="institution">Instituição</Label>
              <Input id="institution" placeholder="Ex: Nubank" value={institution} onChange={(e) => setInstitution(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="limit">Limite total (R$) *</Label>
            <Input id="limit" type="text" inputMode="decimal" placeholder="0,00" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closingDay">Dia de fechamento *</Label>
              <Input id="closingDay" type="number" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDay">Dia de vencimento *</Label>
              <Input id="dueDay" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
            </div>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar cartão"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PurchaseForm({
  open, onOpenChange, cardId, cards, categories, members, onSave, saving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  cardId: string | null
  cards: CardItem[]
  categories: Category[]
  members: Member[]
  onSave: (v: any) => void
  saving: boolean
}) {
  const [description, setDescription] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [installments, setInstallments] = useState("1")
  const [categoryId, setCategoryId] = useState("")
  const [responsibleId, setResponsibleId] = useState("")
  const [selectedCardId, setSelectedCardId] = useState("")

  useEffect(() => {
    if (open) {
      setDescription("")
      setTotalAmount("")
      setPurchaseDate(new Date().toISOString().split("T")[0])
      setInstallments("1")
      setCategoryId("")
      setResponsibleId("")
      setSelectedCardId(cardId || cards[0]?.id || "")
    }
  }, [open, cardId, cards])

  const total = parseFloat(totalAmount.replace(",", ".")) || 0
  const inst = parseInt(installments, 10) || 1
  const installmentValue = inst > 0 ? total / inst : 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || isNaN(total) || total <= 0 || !selectedCardId) {
      toast.error("Preencha os campos obrigatórios")
      return
    }
    onSave({
      description: description.trim(),
      totalAmount: total,
      purchaseDate,
      installments: inst,
      categoryId: categoryId || null,
      cardId: selectedCardId,
      responsibleId: responsibleId || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar compra parcelada</DialogTitle>
          <DialogDescription>O sistema criará automaticamente um lançamento por parcela.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdesc">Descrição *</Label>
            <Input id="pdesc" placeholder="Ex: Geladeira" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pamt">Valor total (R$) *</Label>
              <Input id="pamt" type="text" inputMode="decimal" placeholder="0,00" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdate">Data da compra *</Label>
              <Input id="pdate" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pinst">Parcelas *</Label>
              <Input id="pinst" type="number" min={1} max={48} value={installments} onChange={(e) => setInstallments(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Cartão *</Label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {inst > 1 && total > 0 && (
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span><strong>{inst}x</strong> de <strong>{formatBRL(installmentValue)}</strong></span>
              </div>
            </div>
          )}
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
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar compra"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
