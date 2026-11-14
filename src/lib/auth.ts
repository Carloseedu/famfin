import { db } from "./db"
import { cookies } from "next/headers"
import { randomBytes, timingSafeEqual, pbkdf2 } from "crypto"
import { promisify } from "util"

const pbkdf2Async = promisify(pbkdf2)

// Hash de senha usando PBKDF2 com SHA-512 e salt
// Em produção, usar bcrypt/argon2 — aqui usamos crypto nativo do Node
const ITERATIONS = 100000
const KEY_LENGTH = 64

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex")
    pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, "sha512", (err: Error | null, derivedKey: Buffer) => {
      if (err) return reject(err)
      resolve(`${salt}:${ITERATIONS}:${derivedKey.toString("hex")}`)
    })
  })
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, iterationsStr, hashHex] = stored.split(":")
    if (!salt || !iterationsStr || !hashHex) return resolve(false)
    const iterations = parseInt(iterationsStr, 10)
    pbkdf2(password, salt, iterations, KEY_LENGTH, "sha512", (err: Error | null, derivedKey: Buffer) => {
      if (err) return reject(err)
      const a = Buffer.from(hashHex, "hex")
      const b = Buffer.from(derivedKey.toString("hex"), "hex")
      if (a.length !== b.length) return resolve(false)
      resolve(timingSafeEqual(a, b))
    })
  })
}

export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

export async function createSession(userId: string, persist: boolean): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date()
  // Sessão persistente: 30 dias. Caso contrário: 1 dia.
  expiresAt.setDate(expiresAt.getDate() + (persist ? 30 : 1))

  await db.session.create({
    data: { token, userId, expiresAt },
  })

  return token
}

export async function destroySession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } })
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("fin_session")?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { family: true } } },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } })
    return null
  }

  return session.user
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) throw new Error("UNAUTHORIZED")
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN")
  return user
}

// Helper para gerar cor de avatar a partir do nome
export function colorFromName(name: string): string {
  const colors = ["#1e3a8a", "#0f766e", "#7c2d12", "#6b21a8", "#9d174d", "#155e75"]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
