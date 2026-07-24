import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiCafe, apiError, normalizeEmail, apiBalance, normalizeExternalId, duplicateResponse } from '@/lib/apiV1'
import { executePurchase } from '@/lib/purchase'

// POST /api/v1/redemptions — canjear premio
// { email, type: "stamp" | "reward", rewardId? }
// "stamp": canjea la tarjeta de sellos completa. "reward": canjea un premio de puntos (rewardId).
export async function POST(req: NextRequest) {
  const auth = await requireApiCafe(req)
  if (auth instanceof NextResponse) return auth
  const { cafe } = auth

  const body = await req.json().catch(() => null)
  if (!body) return apiError(400, 'invalid_body', 'Body JSON inválido.')

  const email = normalizeEmail(body.email)
  if (!email) return apiError(400, 'invalid_email', 'Falta email (o es inválido).')

  const kind = String(body.type ?? '')
  if (!['stamp', 'reward'].includes(kind))
    return apiError(400, 'invalid_type', 'type debe ser "stamp" o "reward".')
  if (kind === 'reward' && !body.rewardId)
    return apiError(400, 'missing_reward', 'Falta rewardId para canjear un premio de puntos.')

  const customer = await prisma.customer.findUnique({
    where: { email },
    include: { cafes: { where: { cafeId: cafe.id }, select: { id: true } } },
  })
  if (!customer || !customer.cafes.length)
    return apiError(404, 'customer_not_found', 'Ese email no es cliente de este café.')

  // Idempotencia opcional también en canjes
  const externalId = normalizeExternalId(body.external_id)
  if (externalId) {
    const dup = await duplicateResponse(cafe, externalId)
    if (dup) return dup
  }

  const result = await executePurchase(prisma, cafe, {
    type: kind === 'stamp' ? 'stamp_redeem' : 'points_redeem',
    customerId: customer.id,
    rewardId: kind === 'reward' ? String(body.rewardId) : undefined,
    externalId,
  })
  if (!result.ok) {
    if (result.error === 'duplicate_external_id' && externalId) {
      const dup = await duplicateResponse(cafe, externalId)
      if (dup) return dup
    }
    return apiError(result.status, 'redemption_failed', result.error)
  }

  return NextResponse.json({
    transaction: {
      id: result.transaction.id,
      type: result.transaction.type,
      stamps: result.transaction.stamps,
      points: result.transaction.points,
      created_at: result.transaction.createdAt,
    },
    balance: apiBalance(result.link, cafe),
    message: result.message,
  })
}
