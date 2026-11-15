"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { AuthScreen } from "@/components/auth/AuthScreen"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { DashboardView } from "@/components/dashboard/DashboardView"
import { TransactionsView } from "@/components/transactions/TransactionsView"
import { BillsView } from "@/components/bills/BillsView"
import { CardsView } from "@/components/cards/CardsView"
import { PlanningView } from "@/components/planning/PlanningView"
import { GoalsView } from "@/components/goals/GoalsView"
import { ReportsView } from "@/components/reports/ReportsView"
import { MembersView } from "@/components/members/MembersView"
import { SettingsView } from "@/components/settings/SettingsView"
import { AdminView } from "@/components/admin/AdminView"
import { LoadingState } from "@/components/common/States"
import { Wallet } from "lucide-react"

export default function Home() {
  const { user, family, authLoading, setUser, setAuthLoading, view } = useAppStore()

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/register", { method: "GET" })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user, data.family)
            return
          }
        }
        setUser(null, null)
      } catch {
        setUser(null, null)
      }
    }
    checkSession()
  }, [setUser])

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
          <Wallet className="h-6 w-6" />
        </div>
        <div className="text-sm text-muted-foreground">Carregando FamFin...</div>
        <LoadingState />
      </div>
    )
  }

  if (!user || !family) {
    return <AuthScreen />
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
          {view === "dashboard" && <DashboardView />}
          {view === "transactions" && <TransactionsView />}
          {view === "bills" && <BillsView />}
          {view === "cards" && <CardsView />}
          {view === "planning" && <PlanningView />}
          {view === "goals" && <GoalsView />}
          {view === "reports" && <ReportsView />}
          {view === "members" && <MembersView />}
          {view === "settings" && <SettingsView />}
          {view === "admin" && user?.isSuperAdmin && <AdminView />}
        </main>
      </div>
    </div>
  )
}
