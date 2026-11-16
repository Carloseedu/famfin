"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Wallet, Mail, Lock, User, Users, ArrowRight, ShieldCheck, TrendingUp, PieChart, Ticket, FileText } from "lucide-react"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"
import { Footer } from "@/components/common/Footer"
import { CookieBanner } from "@/components/common/CookieBanner"

export function AuthScreen() {
  const [tab, setTab] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)
  const [recoverMode, setRecoverMode] = useState(false)
  const setUser = useAppStore((s) => s.setUser)
  const router = useRouter()

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginPersist, setLoginPersist] = useState(true)

  const [regFamily, setRegFamily] = useState("")
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regInviteCode, setRegInviteCode] = useState("")
  const [regPersist, setRegPersist] = useState(true)
  const [regAcceptedTerms, setRegAcceptedTerms] = useState(false)

  const [recoverEmail, setRecoverEmail] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, persist: loginPersist }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error || "E-mail ou senha incorretos")
        return
      }
      setUser(data.user, data.family)
      toast.success(`Bem-vindo, ${data.user.name}!`)
      router.refresh()
    } catch {
      toast.error("Erro de conexão. Verifique sua internet.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regAcceptedTerms) {
      toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade para se cadastrar.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: regFamily, name: regName, email: regEmail, password: regPassword,
          inviteCode: regInviteCode, persist: regPersist,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error || "Erro ao cadastrar")
        return
      }
      setUser(data.user, data.family)
      toast.success(`Conta criada! Bem-vindo, ${data.user.name}!`)
      router.refresh()
    } catch {
      toast.error("Erro de conexão. Verifique sua internet.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoverEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao processar")
        return
      }
      toast.success(data.message)
      setRecoverMode(false)
      setTab("login")
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#0f1e3d] via-[#1e3a8a] to-[#0f1e3d] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 25% 30%, white 0%, transparent 40%), radial-gradient(circle at 75% 70%, white 0%, transparent 40%)"
        }} />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">FamFin</div>
            <div className="text-xs text-white/70">Gestão Financeira Familiar</div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            O controle financeiro<br />da sua família, em um só lugar.
          </h1>
          <p className="text-white/80 text-lg">
            Receitas, despesas, cartões, orçamentos e metas — compartilhados entre todos os
            integrantes, com segurança e simplicidade.
          </p>
          <div className="grid gap-3 pt-4">
            {[
              { icon: PieChart, title: "Dashboard completo", desc: "Acompanhe receitas, despesas e saldo em tempo real." },
              { icon: TrendingUp, title: "Metas e orçamentos", desc: "Defina limites por categoria e acompanhe o progresso." },
              { icon: ShieldCheck, title: "Dados seguros", desc: "Cada família tem seu ambiente isolado e protegido." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 backdrop-blur ring-1 ring-white/10">
                <item.icon className="h-5 w-5 mt-0.5 text-emerald-300 shrink-0" />
                <div>
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-white/70">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/50">
          © {new Date().getFullYear()} FamFin · Sistema de gestão financeira familiar
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold">FamFin</div>
              <div className="text-xs text-muted-foreground">Gestão Financeira Familiar</div>
            </div>
          </div>

          {recoverMode ? (
            <Card className="border-border shadow-lg">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Recuperar senha</CardTitle>
                <CardDescription>Informe seu e-mail para receber instruções.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRecover} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recover-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="recover-email" type="email" placeholder="seu@email.com" className="pl-9" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar instruções"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setRecoverMode(false); setTab("login") }}>
                    Voltar para login
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card className="shadow-lg">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
                    <CardDescription>Acesse o painel financeiro da sua família.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="email" type="email" placeholder="seu@email.com" className="pl-9" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="password" type="password" placeholder="••••••••" className="pl-9" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                          <Switch checked={loginPersist} onCheckedChange={setLoginPersist} />
                          Manter sessão
                        </label>
                        <button type="button" onClick={() => setRecoverMode(true)} className="text-sm text-primary hover:underline">
                          Esqueci a senha
                        </button>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Entrando..." : "Entrar"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card className="shadow-lg">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl">Criar nova família</CardTitle>
                    <CardDescription>Cadastre-se como administrador e comece a organizar as finanças.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="family">Nome da família</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="family" placeholder="Ex: Família Silva" className="pl-9" value={regFamily} onChange={(e) => setRegFamily(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Seu nome</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="name" placeholder="Ex: João Silva" className="pl-9" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="reg-email" type="email" placeholder="seu@email.com" className="pl-9" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-password">Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="reg-password" type="password" placeholder="Mínimo 6 caracteres" className="pl-9" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={6} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-invite">Código de convite *</Label>
                        <div className="relative">
                          <Ticket className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reg-invite"
                            placeholder="Ex: FAMFIN-XXXX-XXXX"
                            className="pl-9 uppercase"
                            value={regInviteCode}
                            onChange={(e) => setRegInviteCode(e.target.value.toUpperCase())}
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Para se cadastrar você precisa de um código de convite.
                          Converse com quem te indicou o FamFin.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <Switch checked={regPersist} onCheckedChange={setRegPersist} />
                        Manter sessão por 30 dias
                      </label>

                      {/* Checkbox de aceitação dos Termos (LGPD) */}
                      <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer rounded-md bg-muted/30 p-2">
                        <input
                          type="checkbox"
                          checked={regAcceptedTerms}
                          onChange={(e) => setRegAcceptedTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-input"
                          required
                        />
                        <span>
                          Li e aceito os{" "}
                          <strong>Termos de Uso</strong> e a{" "}
                          <strong>Política de Privacidade</strong> do FamFin,
                          conforme a LGPD (Lei nº 13.709/2018).
                        </span>
                      </label>

                      <Button type="submit" className="w-full" disabled={loading || !regAcceptedTerms}>
                        {loading ? "Criando..." : "Criar conta"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Rodapé com links legais (LGPD) */}
      <Footer />

      {/* Banner de cookies (LGPD) */}
      <CookieBanner />
    </div>
  )
}
