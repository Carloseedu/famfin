"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Users, Home, Receipt, Ticket, Plus, Trash2, Copy, CheckCircle2, XCircle, TrendingUp, Database, Activity, Shield } from "lucide-react"
import { formatBRL, formatDateTimeBR } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"

interface AdminData {
  stats: {
    totalFamilies: number
    totalUsers: number
    totalTransactions: number
    totalCategories: number
    totalCards: number
    totalGoals: number
    activeUsers7d: number
    estimatedDbSizeMB: number
    dbCapacityPercent: number
  }
  recentFamilies: {
    id: string
    name: string
    createdAt: string
    membersCount: number
    transactionsCount: number
    adminName: string
    adminEmail: string
  }[]
  inviteCodes: {
    id: string
    code: string
    maxUses: number
    uses: number
    active: boolean
    expiresAt: string | null
    note: string | null
    createdAt: string
  }[]
}

export function AdminView() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [maxUses, setMaxUses] = useState("1")
  const [note, setNote] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/stats")
      if (res.status === 403) {
        toast.error("Acesso negado. Apenas super admin.")
        return
      }
      const d = await res.json()
      setData(d)
    } catch {
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreateInvite() {
    setSaving(true)
    try {
      const body: any = {
        maxUses: parseInt(maxUses, 10) || 1,
        note: note || undefined,
      }
      if (expiresInDays) body.expiresInDays = parseInt(expiresInDays, 10)

      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || "Erro ao criar cÃ³digo")
        return
      }
      toast.success(`CÃ³digo criado: ${d.invite.code}`)
      setDialogOpen(false)
      setMaxUses("1")
      setNote("")
      setExpiresInDays("")
      load()
    } catch {
      toast.error("Erro de conexÃ£o")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/invite-codes/${deleteId}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Erro ao excluir"); return }
      toast.success("CÃ³digo excluÃ­do")
      setDeleteId(null)
      load()
    } catch {
      toast.error("Erro de conexÃ£o")
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`CÃ³digo ${code} copiado!`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) return <LoadingState message="Carregando painel admin..." />

  if (!data) {
    return <EmptyState icon={Shield} title="Sem dados" description="NÃ£o foi possÃ­vel carregar." />
  }

  const s = data.stats

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Painel administrativo"
        subtitle="VisÃ£o geral da plataforma e controle de cadastros"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Gerar cÃ³digo de convite
          </Button>
        }
      />

      {/* Cards de estatÃ­sticas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Home}
          label="FamÃ­lias cadastradas"
          value={String(s.totalFamilies)}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="UsuÃ¡rios totais"
          value={String(s.totalUsers)}
          subtitle={`${s.activeUsers7d} ativos nos Ãºltimos 7 dias`}
          color="emerald"
        />
        <StatCard
          icon={Receipt}
          label="LanÃ§amentos totais"
          value={String(s.totalTransactions)}
          color="indigo"
        />
        <StatCard
          icon={Activity}
          label="CartÃµes cadastrados"
          value={String(s.totalCards)}
          color="amber"
        />
      </div>

      {/* Capacidade do banco */}
      <Card className={s.dbCapacityPercent > 70 ? "border-amber-300 bg-amber-50" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Capacidade do banco de dados (Supabase Free: 500 MB)</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{s.estimatedDbSizeMB} MB</span>
                <span className="text-sm text-muted-foreground">usados ({s.dbCapacityPercent}%)</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${s.dbCapacityPercent > 80 ? "bg-red-500" : s.dbCapacityPercent > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(s.dbCapacityPercent, 100)}%` }}
                />
              </div>
              {s.dbCapacityPercent > 80 && (
                <div className="text-xs text-red-600 mt-1 font-medium">
                  â ïž Considere migrar para Supabase Pro em breve
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CÃ³digos de convite */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="h-4 w-4 text-amber-600" />
            CÃ³digos de convite ({data.inviteCodes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.inviteCodes.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="Nenhum cÃ³digo gerado ainda"
              description="Gere cÃ³digos para convidar pessoas a se cadastrarem no FamFin."
              action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Gerar primeiro cÃ³digo</Button>}
              className="py-8"
            />
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {data.inviteCodes.map((c) => {
                const isExhausted = c.maxUses > 0 && c.uses >= c.maxUses
                const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date()
                const status = !c.active ? "inativo" : isExpired ? "expirado" : isExhausted ? "esgotado" : "ativo"
                const statusColor = status === "ativo" ? "emerald" : "muted"
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Ticket className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-medium">{c.code}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyCode(c.code)}
                          title="Copiar cÃ³digo"
                        >
                          {copiedCode === c.code ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>Usos: {c.uses}{c.maxUses > 0 ? `/${c.maxUses}` : " (â)"}</span>
                        <span>Â·</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            status === "ativo" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                            "border-muted-foreground/30 text-muted-foreground"
                          }`}
                        >
                          {status}
                        </Badge>
                        {c.note && (
                          <>
                            <span>Â·</span>
                            <span className="truncate">{c.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600"
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ãltimas famÃ­lias cadastradas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-blue-600" />
            Ãltimas famÃ­lias cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentFamilies.length === 0 ? (
            <EmptyState icon={Home} title="Nenhuma famÃ­lia cadastrada" className="py-8" />
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {data.recentFamilies.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Home className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Admin: {f.adminName} ({f.adminEmail})
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTimeBR(f.createdAt)} Â· {f.membersCount} membro(s) Â· {f.transactionsCount} lanÃ§amento(s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar cÃ³digo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar cÃ³digo de convite</DialogTitle>
            <DialogDescription>
              O cÃ³digo gerado poderÃ¡ ser usado por alguÃ©m para se cadastrar no FamFin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxUses">MÃ¡ximo de usos</Label>
              <Input
                id="maxUses"
                type="number"
                min={0}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Quantas vezes o cÃ³digo pode ser usado. Use <strong>0</strong> para ilimitado.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Etiqueta (opcional)</Label>
              <Input
                id="note"
                placeholder="Ex: Amigos do JoÃ£o"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Para vocÃª identificar quem Ã© o cÃ³digo depois.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expira em quantos dias? (opcional)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min={1}
                placeholder="Ex: 30 (vazio = sem expiraÃ§Ã£o)"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateInvite} disabled={saving}>
              {saving ? "Gerando..." : "Gerar cÃ³digo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cÃ³digo?</AlertDialogTitle>
            <AlertDialogDescription>
              O cÃ³digo serÃ¡ removido e nÃ£o poderÃ¡ mais ser usado para novos cadastros.
              FamÃ­lias jÃ¡ cadastradas com ele continuam ativas.
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

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: any
  label: string
  value: string
  subtitle?: string
  color: "blue" | "emerald" | "indigo" | "amber"
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground truncate">{label}</div>
            <div className="text-xl font-bold">{value}</div>
            {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
