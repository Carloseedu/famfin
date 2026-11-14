"use client"

import { Wallet, LayoutDashboard, ArrowLeftRight, Receipt, CreditCard, Target, PieChart, Users, Settings, X, LogOut } from "lucide-react"
import { useAppStore, ViewKey } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/format"

const NAV_ITEMS: { key: ViewKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "transactions", label: "Lançamentos", icon: ArrowLeftRight },
  { key: "bills", label: "Contas a pagar", icon: Receipt },
  { key: "cards", label: "Cartões", icon: CreditCard },
  { key: "planning", label: "Planejamento", icon: Target },
  { key: "goals", label: "Metas", icon: PieChart },
  { key: "reports", label: "Relatórios", icon: PieChart },
  { key: "members", label: "Integrantes", icon: Users },
  { key: "settings", label: "Configurações", icon: Settings },
]

export function Sidebar() {
  const { view, setView, sidebarOpen, setSidebar, user, family } = useAppStore()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.reload()
  }

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-72 shrink-0",
          "bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header do sidebar */}
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/15">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white tracking-tight">FamFin</div>
              <div className="text-xs text-white/60 truncate max-w-[140px]">{family?.name || "—"}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebar(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                view === item.key
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: "1.125rem", height: "1.125rem" }} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Usuário */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9 ring-2 ring-white/20">
              <AvatarFallback
                className="text-white text-xs font-semibold"
                style={{ backgroundColor: user?.avatarColor || "#1e3a8a" }}
              >
                {user ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
              <div className="text-xs text-white/50 truncate">
                {user?.role === "ADMIN" ? "Administrador" : "Usuário"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  )
}
