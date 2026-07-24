// Núcleo de transacciones de fidelidad (sellos/puntos, campañas, referidos).
// Lo comparten /api/transaction (caja con sesión) y /api/v1/* (API pública con key):
// UNA sola implementación de las guardas de concurrencia y las reglas de negocio.
// Recibe el cliente Prisma como parámetro para poder testearlo desde _test/.
import type { Cafe, CustomerCafe, PrismaClient, Transaction } from '@prisma/client'
import { stampsToGrant, pointsToGrant, bonusPointsFor, splitRedeem, bonusExpiryDate, availableBonus } from './campaigns'
import { convertPendingReferral } from './referrals'

const DAY = 24 * 60 * 60 * 1000

export type PurchaseInput = {
  type: string // "stamp_add" | "stamp_redeem" | "points_add" | "points_redeem"
  customerId: string
  amount?: unknown
  rewardId?: string
  externalId?: string // idempotencia (API v1): id del ticket externo; repetido → 409
}

export type PurchaseResult =
  | { ok: false; status: number; error: string }
  | {
      ok: true
      link: CustomerCafe
      transaction: Transaction
      message: string
      campaignApplied: boolean
      referralConverted: boolean
    }

export async function executePurchase(db: PrismaClient, cafe: Cafe, input: PurchaseInput): Promise<PurchaseResult> {
  const { type, customerId, rewardId } = input
  const parsedAmount = typeof input.amount === 'number' ? input.amount : Number(input.amount)
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0
  const cafeId = cafe.id

  const customer = await db.customer.findUnique({ where: { id: customerId }, select: { id: true } })
  if (!customer) return { ok: false, status: 404, error: 'Cliente no encontrado' }

  const link = await db.customerCafe.upsert({
    where: { customerId_cafeId: { customerId, cafeId } },
    update: {},
    create: { customerId, cafeId },
  })

  // Campañas vivas del café — solo pesan al sumar (el canje usa el bucket bonus ya acreditado)
  const now = new Date()
  const campaigns = (type === 'stamp_add' || type === 'points_add')
    ? await db.campaign.findMany({
        where: { cafeId, active: true, startsAt: { lte: now }, endsAt: { gte: now } },
      })
    : []

  type TransactionData = {
    type: string
    customerId: string
    cafeId: string
    amount?: number
    stamps?: number
    points?: number
    note?: string
    externalId?: string
  }

  let txData: TransactionData = { type, customerId, cafeId, ...(input.externalId ? { externalId: input.externalId } : {}) }
  let pointsRedeemedRewardName = ''
  let campaignNote = ''        // sufijo del mensaje al barista/cliente
  let stampInc = 1             // sellos a otorgar (campaña stamp_multiplier)
  let pointsEarnedRegular = 0  // puntos comunes de la compra (sin el regalo)
  let bonusGrant = 0           // puntos de regalo (campaña bonus_points) → van al bucket con vencimiento
  let bonusExpiryDays = 0
  let redeemFromBonus = 0
  let redeemFromRegular = 0

  if (type === 'stamp_add') {
    if (cafe.minPurchaseForStamp > 0) {
      if (!hasValidAmount) return { ok: false, status: 400, error: 'Invalid amount' }
      if (parsedAmount < cafe.minPurchaseForStamp)
        return { ok: false, status: 400, error: `Minimum purchase for stamp is ${cafe.currencySymbol}${cafe.minPurchaseForStamp}` }
    }

    const grant = stampsToGrant(campaigns, now)
    stampInc = grant.stamps
    if (grant.campaign) campaignNote = ` · 🔥 ${grant.campaign.name}`

    txData = {
      ...txData,
      ...(hasValidAmount ? { amount: parsedAmount } : {}),
      stamps: stampInc,
      note: `Stamp added${campaignNote}`,
    }

  } else if (type === 'stamp_redeem') {
    txData = { ...txData, stamps: -cafe.stampsRequired, note: `Redeemed: ${cafe.stampReward}` }

  } else if (type === 'points_add') {
    if (!hasValidAmount) return { ok: false, status: 400, error: 'Invalid amount' }
    const earned = pointsToGrant(parsedAmount, cafe.pointsPerPeso, campaigns, now)
    const bonus = bonusPointsFor(campaigns, now)
    pointsEarnedRegular = earned.points
    bonusGrant = bonus.bonus
    bonusExpiryDays = bonus.expiryDays
    const parts: string[] = []
    if (earned.campaign) parts.push(`x${earned.campaign.multiplier} ${earned.campaign.name}`)
    if (bonus.campaign) parts.push(`+${bonusGrant} de regalo`)
    campaignNote = parts.length ? ` · 🔥 ${parts.join(' · ')}` : ''
    txData = { ...txData, amount: parsedAmount, points: pointsEarnedRegular + bonusGrant, note: `Purchase ${cafe.currencySymbol}${parsedAmount}${campaignNote}` }

  } else if (type === 'points_redeem') {
    if (!rewardId) return { ok: false, status: 400, error: 'No reward specified' }
    const reward = await db.reward.findFirst({ where: { id: rewardId, cafeId, active: true } })
    if (!reward) return { ok: false, status: 404, error: 'Reward not found' }
    pointsRedeemedRewardName = reward.name
    // El bucket de regalo vence antes → se gasta primero; el resto sale de los puntos comunes
    const split = splitRedeem(reward.pointsCost, link.points, link, now)
    redeemFromBonus = split.fromBonus
    redeemFromRegular = split.fromRegular
    txData = { ...txData, points: -reward.pointsCost, note: `Redeemed: ${reward.name}` }

  } else {
    return { ok: false, status: 400, error: 'Unknown transaction type' }
  }

  // Vencimiento de sellos: cada sello nuevo renueva el deadline de TODOS los sellos activos.
  // stampExpiryDays = 0 → sin vencimiento (stampsExpireAt queda null).
  const stampExpiry = cafe.stampExpiryDays > 0
    ? new Date(Date.now() + cafe.stampExpiryDays * DAY)
    : null

  let failure: { status: number; error: string } | null = null

  const transactionResult = await db.$transaction(async tx => {
    if (type === 'stamp_add') {
      if (stampInc === 1) {
        const result = await tx.customerCafe.updateMany({
          where: { id: link.id, stamps: { lt: cafe.stampsRequired } },
          data: { stamps: { increment: 1 }, totalStamps: { increment: 1 }, stampsExpireAt: stampExpiry, stampsExpiryWarned: false },
        })
        if (result.count === 0) throw new Error('STAMP_CARD_FULL')
      } else {
        // Multiplicador: lectura fresca + CAS para no pasar el tope de la tarjeta
        const fresh = await tx.customerCafe.findUniqueOrThrow({ where: { id: link.id }, select: { stamps: true } })
        if (fresh.stamps >= cafe.stampsRequired) throw new Error('STAMP_CARD_FULL')
        const inc = Math.min(stampInc, cafe.stampsRequired - fresh.stamps)
        const result = await tx.customerCafe.updateMany({
          where: { id: link.id, stamps: fresh.stamps },
          data: { stamps: { increment: inc }, totalStamps: { increment: inc }, stampsExpireAt: stampExpiry, stampsExpiryWarned: false },
        })
        if (result.count === 0) throw new Error('CONCURRENT_RETRY')
        txData.stamps = inc // reflejar lo realmente otorgado (cap del tope)
      }

    } else if (type === 'stamp_redeem') {
      const result = await tx.customerCafe.updateMany({
        where: { id: link.id, stamps: { gte: cafe.stampsRequired } },
        data: { stamps: 0, stampsExpireAt: null, stampsExpiryWarned: false },
      })
      if (result.count === 0) throw new Error('NOT_ENOUGH_STAMPS')

    } else if (type === 'points_add') {
      // Bucket de regalo: si el regalo anterior venció y el cron aún no barrió, se reemplaza en vez de sumar
      let bonusData: Record<string, unknown> = {}
      if (bonusGrant > 0) {
        const fresh = await tx.customerCafe.findUniqueOrThrow({ where: { id: link.id }, select: { bonusPoints: true, bonusExpireAt: true } })
        const stale = fresh.bonusPoints > 0 && availableBonus(fresh, now) === 0
        bonusData = {
          bonusPoints: stale ? bonusGrant : { increment: bonusGrant },
          bonusExpireAt: bonusExpiryDate(bonusExpiryDays, now),
        }
      }
      const result = await tx.customerCafe.updateMany({
        where: { id: link.id },
        data: { points: { increment: pointsEarnedRegular }, totalSpent: { increment: parsedAmount }, ...bonusData },
      })
      if (result.count === 0) throw new Error('CUSTOMER_LINK_NOT_FOUND')

    } else if (type === 'points_redeem') {
      const result = await tx.customerCafe.updateMany({
        where: { id: link.id, points: { gte: redeemFromRegular }, bonusPoints: { gte: redeemFromBonus } },
        data: { points: { decrement: redeemFromRegular }, bonusPoints: { decrement: redeemFromBonus } },
      })
      if (result.count === 0) throw new Error('NOT_ENOUGH_POINTS')
    }

    const [updatedLink, createdTx] = await Promise.all([
      tx.customerCafe.findUniqueOrThrow({ where: { id: link.id } }),
      tx.transaction.create({ data: txData }),
    ])

    return { updatedLink, createdTx }
  }).catch(error => {
    if (error instanceof Error) {
      if (error.message === 'STAMP_CARD_FULL')
        failure = { status: 400, error: 'Tarjeta completa, primero canjear.' }
      else if (error.message === 'NOT_ENOUGH_STAMPS')
        failure = { status: 400, error: 'Not enough stamps' }
      else if (error.message === 'NOT_ENOUGH_POINTS')
        failure = { status: 400, error: 'Not enough points' }
      else if (error.message === 'CONCURRENT_RETRY')
        failure = { status: 409, error: 'Hubo actividad simultánea, probá de nuevo.' }
    }
    // Unique [cafeId, externalId] violado → el ticket ya se acreditó antes.
    // El $transaction entero se revierte, así que NO hay doble acreditación.
    if (!failure && (error as { code?: string })?.code === 'P2002')
      failure = { status: 409, error: 'duplicate_external_id' }
    if (!failure) throw error
    return null
  })

  if (failure) return { ok: false, ...(failure as { status: number; error: string }) }
  const { updatedLink, createdTx } = transactionResult!

  // Referidos: la 1ª compra real del referido convierte el "pending" y premia al referente.
  // Corre después del commit de la compra y nunca la hace fallar.
  let referralConverted = false
  if (type === 'stamp_add' || type === 'points_add') {
    try {
      referralConverted = (await convertPendingReferral(db, { cafeId, customerId })) !== null
    } catch (e) {
      console.error('referral convert error:', e)
    }
  }

  // Mensaje con los valores reales post-update
  let message = ''
  if (type === 'stamp_add') {
    message = updatedLink.stamps >= cafe.stampsRequired
      ? `🎉 ¡Tarjeta completa! Podés canjear ${cafe.stampReward}.`
      : (txData.stamps ?? 1) > 1
        ? `+${txData.stamps} sellos (${updatedLink.stamps}/${cafe.stampsRequired})${campaignNote}`
        : `Sello ${updatedLink.stamps}/${cafe.stampsRequired} agregado.`
  } else if (type === 'stamp_redeem') {
    message = `✅ Recompensa canjeada: ${cafe.stampReward}`
  } else if (type === 'points_add') {
    message = `+${txData.points} puntos ganados${campaignNote}.`
  } else if (type === 'points_redeem') {
    message = `✅ Recompensa canjeada: ${pointsRedeemedRewardName}`
  }
  if (referralConverted) message += ' · 🤝 Se acreditó el premio a quien lo invitó'

  return {
    ok: true,
    link: updatedLink,
    transaction: createdTx,
    message,
    campaignApplied: campaignNote !== '',
    referralConverted,
  }
}
