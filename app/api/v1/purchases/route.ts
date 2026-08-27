import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiCafe, apiError, normalizeEmail, apiBalance, normalizeExternalId, duplicateResponse } from '@/lib/apiV1'
import { cafeCanAcceptCustomer } from '@/lib/plan'
import { executePurchase } from '@/lib/purchase'

// POST /api/v1/purchases — registrar una compra
// { email, amount?, mode? ("auto"|"points"|"stamp"), auto_register? (bool), name? }
// mode "auto": puntos si el café los tiene activos y hay monto; si no, sello.
export async function POST(req: NextRequest) {
  const auth = await requireApiCafe(req)
  if (auth instanceof NextResponse) return auth
  const { cafe } = auth

  const body = await req.json().catch(() => null)
  if (!body) return apiError(400, 'invalid_body', 'Body JSON inválido.')

  const email = normalizeEmail(body.email)
  if (!email) return apiError(400, 'invalid_email', 'Falta email (o es inválido).')

  const mode = body.mode === undefined ? 'auto' : String(body.mode)
  if (!['auto', 'points', 'stamp'].includes(mode))
    return apiError(400, 'invalid_mode', 'mode debe ser "auto", "points" o "stamp".')

  // Idempotencia: si el ticket externo ya se acreditó, devolver lo ya hecho (no duplica)
  const externalId = normalizeExternalId(body.external_id)
  if (externalId) {
    const dup = await duplicateResponse(cafe, externalId)
    if (dup) return dup
  }

  const amount = body.amount === undefined ? undefined : Number(body.amount)
  const hasAmount = Number.isFinite(amount) && (amount as number) > 0

  // Resolver cliente. La compra por API solo crea el vínculo si auto_register=true
  // (respetando el límite del plan); si no, el cliente ya tiene que ser del café.
  let customer = await prisma.customer.findUnique({
    where: { email },
    include: { cafes: { where: { cafeId: cafe.id }, select: { id: true } } },
  })
  const isLinked = !!customer?.cafes.length

  if (!customer || !isLinked) {
    if (!body.auto_register)
      return apiError(404, 'customer_not_found', 'Ese email no es cliente de este café. Mandá auto_register: true para darlo de alta en la misma compra.')
    if (!(await cafeCanAcceptCustomer(cafe, email)))
      return apiError(403, 'plan_limit_reached', 'El café alcanzó el máximo de clientes de su plan.')
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : email.split('@')[0]
    customer = {
      ...(await prisma.customer.upsert({
        where: { email },
        update: {},
        create: { email, name },
      })),
      cafes: [],
    }
  }

  // Tipo de transacción efectivo
  let type: 'points_add' | 'stamp_add'
  if (mode === 'points') {
    if (!cafe.pointsEnabled) return apiError(400, 'points_disabled', 'Este café no tiene puntos activos.')
    type = 'points_add'
  } else if (mode === 'stamp') {
    if (!cafe.stampEnabled) return apiError(400, 'stamps_disabled', 'Este café no tiene sellos activos.')
    type = 'stamp_add'
  } else {
    type = cafe.pointsEnabled && hasAmount ? 'points_add' : cafe.stampEnabled ? 'stamp_add' : 'points_add'
  }

  const result = await executePurchase(prisma, cafe, { type, customerId: customer.id, amount, externalId })
  if (!result.ok) {
    // Carrera entre el pre-chequeo y el insert: devolver la acreditación original
    if (result.error === 'duplicate_external_id' && externalId) {
      const dup = await duplicateResponse(cafe, externalId)
      if (dup) return dup
    }
    return apiError(result.status, 'purchase_failed', result.error)
  }

  return NextResponse.json({
    transaction: {
      id: result.transaction.id,
      type: result.transaction.type,
      amount: result.transaction.amount,
      stamps: result.transaction.stamps,
      points: result.transaction.points,
      created_at: result.transaction.createdAt,
    },
    balance: apiBalance(result.link, cafe),
    message: result.message,
    campaign_applied: result.campaignApplied,
    referral_converted: result.referralConverted,
    signup_bonus_granted: result.signupBonusGranted,
  })
}
