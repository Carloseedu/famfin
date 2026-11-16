"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Tag, Wallet, CreditCard, Settings as SettingsIcon, Building2, Shield, Download } from "lucide-react"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"

interface Category { id: string; name: string; type: string; color: string; icon?: string | null; isDefault: boolean }
interface Account { id: string; name: string; institution: string | null; type: string; initialBalance: number }

export function SettingsView() {
  const { user } = useAppStore()
  const [tab, setTab] = useState("categories")
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [accDialogOpen, setAccDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [editingAcc, setEditingAcc] = useState<Account | null>(null)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)
  const [deleteAccId, setDeleteAccId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // LGPD: estados para exportar e excluir dados
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Exportar todos os dados do usuário em JSON
  function handleExportData() {
    window.open("/api/account/export", "_blank")
    toast.success("Exportação iniciada. O arquivo JSON será baixado.")
  }

  // Excluir conta + todos os dados (LGPD art. 18, VI)
  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: deleteConfirmEmail }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error || "Erro ao excluir conta")
        return
      }
      toast.success(data.message || "Conta excluída com sucesso.")
      setDeleteDialogOpen(false)
      // Redireciona para a tela de login após 2 segundos
      setTimeout(() => window.location.reload(), 2000)
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setDeleting(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [catRes, accRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/accounts"),
      ])
      const catData = await catRes.json()
      const accData = await accRes.json()
      setCategories(catData.categories || [])
      setAccounts(accData.accounts || [])
    } catch {
      toast.error("Erro ao carregar configurações")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSaveCategory(values: any) {
    setSaving(true)
    try {
      if (editingCat) {
        const res = await fetch(`/api/categories/${editingCat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || "Erro"); return }
        toast.success("Categoria atualizada!")
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || "Erro"); return }
        toast.success("Categoria criada!")
      }
      setCatDialogOpen(false)
      setEditingCat(null)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setSaving(false) }
  }

  async function handleSaveAccount(values: any) {
    setSaving(true)
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro"); return }
      toast.success("Conta criada!")
      setAccDialogOpen(false)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setSaving(false) }
  }

  async function handleDeleteCategory() {
    if (!deleteCatId) return
    try {
      const res = await fetch(`/api/categories/${deleteCatId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao excluir"); return }
      toast.success("Categoria excluída")
      setDeleteCatId(null)
      load()
    } catch { toast.error("Erro de conexão") }
  }

  async function handleDeleteAccount() {
    if (!deleteAccId) return
    try {
      const res = await fetch(`/api/accounts/${deleteAccId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao excluir"); return }
      toast.success("Conta excluída")
      setDeleteAccId(null)
      load()
    } catch { toast.error("Erro de conexão") }
  }

  const isAdmin = user?.role === "ADMIN"
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE")
  const incomeCategories = categories.filter((c) => c.type === "INCOME")

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Configurações"
        subtitle="Gerencie categorias, contas e preferências"
      />

      {!isAdmin && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            Apenas administradores podem alterar configurações. Você está visualizando em modo somente leitura.
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="accounts">Contas bancárias</TabsTrigger>
        </TabsList>

        {/* CATEGORIAS */}
        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Despesas */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-red-500" />
                  Categorias de despesa
                </CardTitle>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => { setEditingCat(null); setCatDialogOpen(true) }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nova
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loading ? <LoadingState /> : (
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {expenseCategories.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-sm flex-1 truncate">{c.name}</span>
                        {c.isDefault && <Badge variant="outline" className="text-xs">Padrão</Badge>}
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCat(c); setCatDialogOpen(true) }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleteCatId(c.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Receitas */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-500" />
                  Categorias de receita
                </CardTitle>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => { setEditingCat(null); setCatDialogOpen(true) }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nova
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loading ? <LoadingState /> : (
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {incomeCategories.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-sm flex-1 truncate">{c.name}</span>
                        {c.isDefault && <Badge variant="outline" className="text-xs">Padrão</Badge>}
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCat(c); setCatDialogOpen(true) }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleteCatId(c.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CONTAS */}
        <TabsContent value="accounts" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                Contas bancárias
              </CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => setAccDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Nova conta
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <LoadingState /> : accounts.length === 0 ? (
                <EmptyState icon={Wallet} title="Nenhuma conta cadastrada" />
              ) : (
                <div className="divide-y divide-border">
                  {accounts.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-3">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-50">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.institution || "—"} · {a.type === "CHECKING" ? "Conta corrente" : a.type === "SAVINGS" ? "Poupança" : "Dinheiro"}
                        </div>
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteAccId(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Card de info do sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Informações do sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Moeda</span>
            <span className="font-medium">Real brasileiro (BRL)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Formato de data</span>
            <span className="font-medium">dd/mm/aaaa</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Banco de dados</span>
            <span className="font-medium">PostgreSQL (via Prisma)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Autenticação</span>
            <span className="font-medium">Sessão segura com cookies httpOnly</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Isolamento de dados</span>
            <span className="font-medium">Por família (familyId)</span>
          </div>
        </CardContent>
      </Card>

      {/* Card LGPD: Exportar e Excluir dados */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            Seus dados (LGPD)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/30 p-3 text-sm">
            <div className="font-medium mb-1">Exportar meus dados</div>
            <p className="text-xs text-muted-foreground mb-3">
              Baixe TODOS os seus dados (família, lançamentos, cartões, metas, etc.)
              em formato JSON. Conforme LGPD art. 18, V (portabilidade).
            </p>
            <Button onClick={handleExportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Baixar meus dados
            </Button>
          </div>

          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
            <div className="font-medium mb-1 text-red-900">Excluir minha conta</div>
            <p className="text-xs text-red-700 mb-3">
              Exclui permanentemente sua conta e TODOS os dados da sua família.
              Esta ação é irreversível. Se você for o admin e houver outros integrantes,
              apenas sua conta será excluída (a família continua para os demais).
              Conforme LGPD art. 18, VI (direito ao esquecimento).
            </p>
            <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir conta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-900">⚠️ Excluir minha conta</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os dados da sua família serão permanentemente apagados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-900">
              <div className="font-medium mb-1">O que será apagado:</div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Todas as receitas e despesas cadastradas</li>
                <li>Todos os cartões e compras parceladas</li>
                <li>Todas as contas bancárias</li>
                <li>Todas as metas e orçamentos</li>
                <li>Todas as categorias personalizadas</li>
                <li>Todos os integrantes da família</li>
                <li>Histórico de auditoria</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deleteEmail">
                Digite seu e-mail para confirmar: <span className="text-red-600">*</span>
              </Label>
              <Input
                id="deleteEmail"
                type="email"
                placeholder={user?.email || ""}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || !deleteConfirmEmail}
            >
              {deleting ? "Excluindo..." : "Sim, excluir tudo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryForm
        open={catDialogOpen}
        onOpenChange={(v) => { setCatDialogOpen(v); if (!v) setEditingCat(null) }}
        editing={editingCat}
        onSave={handleSaveCategory}
        saving={saving}
      />

      <AccountForm
        open={accDialogOpen}
        onOpenChange={setAccDialogOpen}
        onSave={handleSaveAccount}
        saving={saving}
      />

      <AlertDialog open={!!deleteCatId} onOpenChange={(v) => !v && setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Não é possível excluir categorias com lançamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAccId} onOpenChange={(v) => !v && setDeleteAccId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Não é possível excluir contas com lançamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CategoryForm({
  open, onOpenChange, editing, onSave, saving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Category | null
  onSave: (v: any) => void
  saving: boolean
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE")
  const [color, setColor] = useState("#3b82f6")

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setType(editing.type as any)
      setColor(editing.color)
    } else {
      setName(""); setType("EXPENSE"); setColor("#3b82f6")
    }
  }, [editing, open])

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"]

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("Informe o nome"); return }
    onSave({ name: name.trim(), type, color })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>Personalize com nome, tipo e cor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cname">Nome *</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={`p-2 rounded-lg border-2 text-sm font-medium ${type === "EXPENSE" ? "border-red-500 bg-red-50 text-red-700" : "border-border"}`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`p-2 rounded-lg border-2 text-sm font-medium ${type === "INCOME" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border"}`}
              >
                Receita
              </button>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AccountForm({
  open, onOpenChange, onSave, saving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (v: any) => void
  saving: boolean
}) {
  const [name, setName] = useState("")
  const [institution, setInstitution] = useState("")
  const [type, setType] = useState("CHECKING")
  const [initialBalance, setInitialBalance] = useState("0")

  useEffect(() => {
    if (open) {
      setName(""); setInstitution(""); setType("CHECKING"); setInitialBalance("0")
    }
  }, [open])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("Informe o nome"); return }
    onSave({
      name: name.trim(),
      institution: institution || null,
      type,
      initialBalance: parseFloat(initialBalance.replace(",", ".")) || 0,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conta bancária</DialogTitle>
          <DialogDescription>Cadastre contas para vincular aos lançamentos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aname">Nome *</Label>
            <Input id="aname" placeholder="Ex: Conta Corrente" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ainst">Instituição</Label>
            <Input id="ainst" placeholder="Ex: Banco do Brasil" value={institution} onChange={(e) => setInstitution(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="CHECKING">Conta corrente</option>
                <option value="SAVINGS">Poupança</option>
                <option value="CASH">Dinheiro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="abal">Saldo inicial</Label>
              <Input id="abal" type="text" inputMode="decimal" placeholder="0,00" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar conta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
