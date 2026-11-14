"use client"

import { create } from "zustand"

export type ViewKey =
  | "dashboard"
  | "transactions"
  | "bills"
  | "cards"
  | "planning"
  | "goals"
  | "reports"
  | "members"
  | "settings"

interface AppState {
  // Auth
  user: { id: string; name: string; email: string; role: string; avatarColor: string } | null
  family: { id: string; name: string } | null
  authLoading: boolean
  setUser: (user: AppState["user"], family: AppState["family"]) => void
  setAuthLoading: (v: boolean) => void

  // Navigation
  view: ViewKey
  setView: (v: ViewKey) => void

  // Period filter
  month: number
  year: number
  setPeriod: (month: number, year: number) => void

  // Sidebar (mobile)
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void
}

const now = new Date()

export const useAppStore = create<AppState>((set) => ({
  user: null,
  family: null,
  authLoading: true,
  setUser: (user, family) => set({ user, family, authLoading: false }),
  setAuthLoading: (v) => set({ authLoading: v }),

  view: "dashboard",
  setView: (view) => set({ view, sidebarOpen: false }),

  month: now.getMonth() + 1,
  year: now.getFullYear(),
  setPeriod: (month, year) => set({ month, year }),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (v) => set({ sidebarOpen: v }),
}))
