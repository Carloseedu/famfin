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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, UserPlus, Pencil, Trash2, Users, Shield, Crown } from "lucide-react"
import { formatDateBR, getInitials } from "@/lib/format"
import { EmptyState, LoadingState, SectionTitle } from "@/components/common/States"
import { toast } from "sonner"

interface Member {
  id: string
  name: string
  email: string
  role: string
  avatarColor: string
  createdAt: string
}

export function MembersView() {
  const { user, family } = useAppStore()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/members")
      const data = await res.json()
      setMembers(data.members || [])
    } catch {
      toast.error("Erro ao carregar integrantes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(values: any) {
    setSaving(true)
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao adicionar"); return }
      toast.success("Integrante adicionado!")
      setDialogOpen(false)
      load()
    } catch { toast.error("Erro de conexão") }
    finally { setSaving(false) }
  }

  async function handleUpdateRole(member: Member, role: string) {
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) { toast.error("Erro ao atualizar"); return }
      toast.success("Permissão atualizada")
      load()
    } catch { toast.error("Erro de conexão") }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/members/${deleteId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao remover"); return }
      toast.success("Integrante removido")
      setDeleteId(null)
      load()
    } catch { toast.error("Erro de conexão") }
  }

  const isAdmin = user?.role === "ADMIN"
  const adminCount = members.filter((m) => m.role === "ADMIN").length

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Integrantes"
        subtitle={family?.name}
        action={
          isAdmin && (
            <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
              <UserPlus className="h-4 w-4 mr-2" /> Convidar integrante
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total de integrantes</div>
            <div className="text-xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Administradores</div>
            <div className="text-xl font-bold text-blue-600">{adminCount}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Usuários comuns</div>
            <div className="text-xl font-bold">{members.length - adminCount}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <LoadingState />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum integrante" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id} className={`card-hover ${m.id === user?.id ? "ring-2 ring-primary/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-border">
                    <AvatarFallback
                      className="text-white font-semibold"
                      style={{ backgroundColor: m.avatarColor }}
                    >
                      {getInitials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{m.name}</span>
                      {m.id === user?.id && <Badge variant="outline" className="text-xs">Você</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Desde {formatDateBR(m.createdAt)}
                    </div>
                    <div className="mt-2">
                      {m.role === "ADMIN" ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          <Crown className="h-3 w-3 mr-1" /> Administrador
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Shield className="h-3 w-3 mr-1" /> Usuário
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && m.id !== user?.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Select
                      value={m.role}
                      onValueChange={(v) => handleUpdateRole(m, v)}
                      disabled={m.role === "ADMIN" && adminCount <= 1}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">Usuário</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => setDeleteId(m.id)}
                      disabled={m.role === "ADMIN" && adminCount <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Card de permissões */}
      <Card>
        <CardHeader><CardTitle className="text-base">Permissões por nível</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Administrador</div>
              <div className="text-muted-foreground text-xs">
                Acesso completo: gerenciar integrantes, categorias, contas, cartões, excluir lançamentos, configurar orçamentos e consultar relatórios.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Usuário</div>
              <div className="text-muted-foreground text-xs">
                Registrar receitas e despesas, consultar movimentações e relatórios, editar próprios lançamentos.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MemberForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        saving={saving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover integrante?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos criados por este integrante serão preservados (sem responsável vinculado).
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MemberForm({
  open, onOpenChange, onSave, saving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (v: any) => void
  saving: boolean
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("USER")

  useEffect(() => {
    if (open) {
      setName(""); setEmail(""); setPassword(""); setRole("USER")
    }
  }, [open])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || password.length < 6) {
      toast.error("Preencha todos os campos (senha mínimo 6 caracteres)")
      return
    }
    onSave({ name: name.trim(), email: email.trim(), password, role })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar integrante</DialogTitle>
          <DialogDescription>
            O integrante terá acesso ao ambiente financeiro da família.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mname">Nome *</Label>
            <Input id="mname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memail">E-mail *</Label>
            <Input id="memail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpass">Senha inicial *</Label>
            <Input id="mpass" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <p className="text-xs text-muted-foreground">O integrante poderá alterá-la no primeiro acesso.</p>
          </div>
          <div className="space-y-2">
            <Label>Nível de acesso</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Usuário</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adicionando..." : "Adicionar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
