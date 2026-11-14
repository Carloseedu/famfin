"use client"

import { Menu, Bell, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppStore } from "@/lib/store"
import { monthName, getInitials } from "@/lib/format"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function Header() {
  const { toggleSidebar, user, family, month, year, setPeriod } = useAppStore()
  const now = new Date()
  const [notifications, setNotifications] = useState<{ id: string; title: string; desc: string; type: string }[]>([])

  async function loadNotifications() {
    try {
      const res = await fetch(`/api/dashboard?month=${month}&year=${year}`)
      if (!res.ok) return
      const data = await res.json()
      const notifs: { id: string; title: string; desc: string; type: string }[] = []

      if (data.indicators?.overdue?.length > 0) {
        notifs.push({
          id: "overdue",
          title: `${data.indicators.overdue.length} conta(s) atrasada(s)`,
          desc: "Verifique as contas vencidas e quite o quanto antes.",
          type: "danger",
        })
      }
      if (data.indicators?.upcoming?.length > 0) {
        notifs.push({
          id: "upcoming",
          title: `${data.indicators.upcoming.length} conta(s) vencendo em 7 dias`,
          desc: "Prepare-se para os próximos vencimentos.",
          type: "warning",
        })
      }
      if (data.indicators?.budgetAlerts?.length > 0) {
        const exceeded = data.indicators.budgetAlerts.filter((b: any) => b.exceeded).length
        if (exceeded > 0) {
          notifs.push({
            id: "budget",
            title: `${exceeded} categoria(s) acima do orçamento`,
            desc: "Revise seus gastos para evitar extrapolações.",
            type: "warning",
          })
        }
      }

      setNotifications(notifs)
    } catch {
      // ignore
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
        {/* Lado esquerdo: menu mobile + família + período */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden sm:block">
            <div className="text-xs text-muted-foreground">Família</div>
            <div className="font-semibold text-sm leading-tight">{family?.name}</div>
          </div>

          <div className="hidden md:flex items-center gap-2 ml-2">
            <Select value={String(month)} onValueChange={(v) => setPeriod(parseInt(v), year)}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {monthName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setPeriod(month, parseInt(v))}>
              <SelectTrigger className="w-24 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lado direito: notificações + avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Período mobile */}
          <div className="md:hidden flex items-center gap-1">
            <Select value={String(month)} onValueChange={(v) => setPeriod(parseInt(v), year)}>
              <SelectTrigger className="w-24 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {monthName(m).slice(0, 3)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" onClick={loadNotifications}>
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-2">
                <div className="font-semibold text-sm">Notificações</div>
                {notifications.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg text-sm ${
                        n.type === "danger" ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"
                      }`}
                    >
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs opacity-80 mt-0.5">{n.desc}</div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 ring-2 ring-primary/20">
              <AvatarFallback
                className="text-xs font-semibold text-white"
                style={{ backgroundColor: user?.avatarColor || "#1e3a8a" }}
              >
                {user ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </div>
        </div>
      </div>
    </header>
  )
}
