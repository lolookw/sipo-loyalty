// Claves de la API pública v1. Recibe el cliente Prisma como parámetro (testeable desde _test/).
import type { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'

const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const KEY_RANDOM_LENGTH = 32
export const KEY_PREFIX = 'sipo_live_'

/** Genera una clave nueva. Se muestra UNA sola vez; en DB va solo el hash. */
export function generateApiKey(): { key: string; prefix: string; keyHash: string } {
  const bytes = randomBytes(KEY_RANDOM_LENGTH)
  let random = ''
  for (let i = 0; i < KEY_RANDOM_LENGTH; i++) random += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length]
  const key = KEY_PREFIX + random
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 6) + '…', keyHash: hashApiKey(key) }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export type ApiAuthResult = {
  cafe: import('@prisma/client').Cafe
  apiKeyId: string
} | null

/** Autentica un header Authorization ("Bearer sipo_live_…"). Null si es inválida o está revocada. */
export async function authenticateApiKey(db: PrismaClient, authorization: string | null): Promise<ApiAuthResult> {
  if (!authorization) return null
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim())
  if (!match || !match[1].startsWith(KEY_PREFIX)) return null

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash: hashApiKey(match[1]) },
    select: { id: true, active: true, cafe: true },
  })
  if (!apiKey || !apiKey.active) return null

  // lastUsedAt es informativo: no bloquea la request si falla
  db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return { cafe: apiKey.cafe, apiKeyId: apiKey.id }
}
