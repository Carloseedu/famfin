// Formatação de valores monetários no padrão brasileiro
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0)
}

export function formatBRLCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}k`
  }
  return formatBRL(value)
}

// Formatação de datas no padrão brasileiro
// IMPORTANTE: usa métodos UTC para evitar bug de fuso horário (ex: 26/11 vira 25/11)
// Isso acontece porque new Date("2026-11-26") é interpretado como meia-noite UTC,
// e no Brasil (UTC-3) isso equivale a 21h do dia anterior.

// Helper interno: extrai ano/mês/dia de uma string ISO ou Date, usando UTC
function parseDateUTC(date: Date | string): { year: number; month: number; day: number; hours: number; minutes: number } {
  const d = typeof date === "string" ? new Date(date) : date
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1, // getUTCMonth retorna 0-11
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  }
}

const pad2 = (n: number) => String(n).padStart(2, "0")

export function formatDateBR(date: Date | string): string {
  const { day, month, year } = parseDateUTC(date)
  return `${pad2(day)}/${pad2(month)}/${year}`
}

export function formatDateShort(date: Date | string): string {
  const { day, month } = parseDateUTC(date)
  return `${pad2(day)}/${pad2(month)}`
}

export function formatDateTimeBR(date: Date | string): string {
  const { day, month, year, hours, minutes } = parseDateUTC(date)
  return `${pad2(day)}/${pad2(month)}/${year} ${pad2(hours)}:${pad2(minutes)}`
}

export function monthName(month: number): string {
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]
  return names[month - 1] || ""
}

export function monthNameShort(month: number): string {
  const names = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ]
  return names[month - 1] || ""
}

export function getInitials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Calcula status de uma transação com base no vencimento
export function computeStatus(
  status: string,
  dueDate: Date | string | null
): string {
  if (status === "PAID") return "PAID"
  if (!dueDate) return status === "PENDING" ? "PENDING" : status
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  if (due < now) return "OVERDUE"
  return "PENDING"
}

// Calcula diferença em dias entre duas datas
export function daysBetween(date: Date | string, ref: Date = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date
  const ms = d.getTime() - ref.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ")
}
