// Helpers de la API pública v1: auth por key, formato de errores y de balances.
import { NextResponse } from 'next/server'
import type { Cafe, CustomerCafe } from '@prisma/client'
import { prisma } from './prisma'
import { authenticateApiKey } from './apiKeys'
import { availableBonus } from './campaigns'
import { getEffectivePlan, isServiceLimited } from './planStatus'
import { getPlatformConfig } from './platformConfig'

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** La API es un beneficio del plan pago: en prueba o vencido no opera (mismo criterio que el resto del servicio). */
export async function apiPlanBlocked(cafe: Cafe): Promise<NextResponse | null> {
  const { graceDays } = await getPlatformConfig()
  if (isServiceLimited(getEffectivePlan(cafe, graceDays)))
    return apiError(403, 'plan_required', 'La API está disponible para cafeterías con plan activo. Activá tu plan para usar integraciones.')
  return null
}

/** Autentica la request y valida el plan. Devuelve el café o una respuesta 401/403 lista para retornar. */
export async function requireApiCafe(req: Request): Promise<{ cafe: Cafe } | NextResponse> {
  const auth = await authenticateApiKey(prisma, req.headers.get('authorization'))
  if (!auth) return apiError(401, 'invalid_api_key', 'API key inválida o revocada. Enviala como "Authorization: Bearer sipo_live_…".')
  const blocked = await apiPlanBlocked(auth.cafe)
  if (blocked) return blocked
  return { cafe: auth.cafe }
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

/** external_id normalizado del body (idempotencia). */
export function normalizeExternalId(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined
  const id = String(raw).trim()
  return id ? id.slice(0, 120) : undefined
}

/** Si ese external_id ya se acreditó en el café, arma la respuesta idempotente (duplicate: true). */
export async function duplicateResponse(cafe: Cafe, externalId: string) {
  const existing = await prisma.transaction.findUnique({
    where: { cafeId_externalId: { cafeId: cafe.id, externalId } },
  })
  if (!existing) return null
  const link = await prisma.customerCafe.findUnique({
    where: { customerId_cafeId: { customerId: existing.customerId, cafeId: cafe.id } },
  })
  return NextResponse.json({
    duplicate: true,
    transaction: {
      id: existing.id,
      type: existing.type,
      amount: existing.amount,
      stamps: existing.stamps,
      points: existing.points,
      created_at: existing.createdAt,
    },
    balance: link ? apiBalance(link, cafe) : null,
    message: 'Ese external_id ya fue acreditado antes: no se registró de nuevo.',
  })
}

/** Balance de un cliente para respuestas de la API (los puntos incluyen el regalo vigente). */
export function apiBalance(link: CustomerCafe, cafe: Cafe) {
  const bonus = availableBonus(link, new Date())
  return {
    stamps: link.stamps,
    stamps_required: cafe.stampsRequired,
    stamp_reward: cafe.stampReward,
    points: Math.floor(link.points + bonus),
    bonus_points: Math.floor(bonus),
    bonus_expires_at: bonus > 0 ? link.bonusExpireAt : null,
    stamps_expire_at: link.stampsExpireAt,
  }
}
