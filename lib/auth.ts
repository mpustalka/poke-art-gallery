import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'admin_session'
const SESSION_MS = 1000 * 60 * 60 * 24 * 7

function getSecret() {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) throw new Error('ADMIN_PASSWORD is not set')
  return secret
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('hex')
}

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function isAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD)
}

export function verifyPassword(password: string) {
  return safeEqual(password, getSecret())
}

export async function createSession() {
  const expires = Date.now() + SESSION_MS
  const payload = String(expires)
  const store = await cookies()
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: true,
    // "none" keeps the session working inside the v0 preview iframe.
    sameSite: 'none',
    path: '/',
    expires: new Date(expires),
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAdmin() {
  if (!isAuthConfigured()) return false
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  if (!safeEqual(signature, sign(payload))) return false
  return Number(payload) > Date.now()
}
