// Lógica de referidos. Recibe el cliente Prisma como parámetro para poder
// ejercitarla tal cual desde los tests de _test/ (contra la DB local).
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const DAY = 24 * 60 * 60 * 1000

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

export function generateReferralCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return code
}

/** Devuelve el código de invitación del link, generándolo la primera vez. */
export async function ensureReferralCode(db: PrismaClient, linkId: string): Promise<string | null> {
  const link = await db.customerCafe.findUnique({ where: { id: linkId }, select: { referralCode: true } })
  if (!link) return null
  if (link.referralCode) return link.referralCode
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const updated = await db.customerCafe.update({
        where: { id: linkId },
        data: { referralCode: generateReferralCode() },
      })
      return updated.referralCode
    } catch {
      // colisión de código (unique) — reintentar con otro
    }
  }
  return null
}

export type AttachResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_code' | 'wrong_cafe' | 'self_referral' | 'already_customer' | 'already_referred' }

/**
 * Registra un referido "pending" cuando alguien se suma al café con un código.
 * Anti-abuso: código del mismo café, sin auto-referirse, solo clientes realmente
 * nuevos (sin link previo ni compras), y un referido cuenta una sola vez.
 * El caller garantiza que el link del referido no existía antes de esta alta.
 */
export async function attachReferral(
  db: PrismaClient,
  { cafeId, code, referredCustomerId }: { cafeId: string; code: string; referredCustomerId: string },
): Promise<AttachResult> {
  const referrerLink = await db.customerCafe.findUnique({
    where: { referralCode: code.trim().toUpperCase() },
    select: { cafeId: true, customerId: true },
  })
  if (!referrerLink) return { ok: false, reason: 'invalid_code' }
  if (referrerLink.cafeId !== cafeId) return { ok: false, reason: 'wrong_cafe' }
  if (referrerLink.customerId === referredCustomerId) return { ok: false, reason: 'self_referral' }

  // Cinturón extra: si ya tiene compras en este café, no era nuevo
  const priorTx = await db.transaction.findFirst({
    where: { cafeId, customerId: referredCustomerId, type: { in: ['stamp_add', 'points_add'] } },
    select: { id: true },
  })
  if (priorTx) return { ok: false, reason: 'already_customer' }

  try {
    await db.referral.create({
      data: { cafeId, referrerCustomerId: referrerLink.customerId, referredCustomerId },
    })
    return { ok: true }
  } catch {
    // unique [cafeId, referredCustomerId] — ya fue referido antes
    return { ok: false, reason: 'already_referred' }
  }
}

export type ConvertResult = { rewardType: string; granted: number; referrerCustomerId: string } | null

/**
 * En la 1ª compra real del referido: marca el referido como convertido y acredita
 * el premio al referente UNA sola vez (claim atómico vía updateMany sobre "pending").
 * Devuelve lo acreditado, o null si no había nada pendiente.
 */
export async function convertPendingReferral(
  client: PrismaClient,
  { cafeId, customerId }: { cafeId: string; customerId: string },
): Promise<ConvertResult> {
  const referral = await client.referral.findUnique({
    where: { cafeId_referredCustomerId: { cafeId, referredCustomerId: customerId } },
    select: { id: true, status: true, referrerCustomerId: true },
  })
  if (!referral || referral.status !== 'pending') return null

  return client.$transaction(async db => {
    // Claim atómico: solo una compra concurrente puede convertirlo
    const claimed = await db.referral.updateMany({
      where: { id: referral.id, status: 'pending', rewardGranted: false },
      data: { status: 'converted', rewardGranted: true, convertedAt: new Date() },
    })
    if (claimed.count === 0) return null

    const cafe = await db.cafe.findUniqueOrThrow({
      where: { id: cafeId },
      select: { referralEnabled: true, referralRewardType: true, referralRewardAmount: true, stampsRequired: true, stampExpiryDays: true },
    })
    // Si el dueño desactivó referidos entre el alta y la compra, se consume sin premio
    if (!cafe.referralEnabled) return null

    const referrerLink = await db.customerCafe.findUnique({
      where: { customerId_cafeId: { customerId: referral.referrerCustomerId, cafeId } },
      select: { id: true, stamps: true },
    })
    if (!referrerLink) return null // el referente ya no es cliente del café

    const amount = cafe.referralRewardAmount
    if (cafe.referralRewardType === 'stamps') {
      const inc = Math.min(Math.max(1, Math.round(amount)), Math.max(0, cafe.stampsRequired - referrerLink.stamps))
      if (inc > 0) {
        const stampExpiry = cafe.stampExpiryDays > 0 ? new Date(Date.now() + cafe.stampExpiryDays * DAY) : null
        await db.customerCafe.update({
          where: { id: referrerLink.id },
          data: { stamps: { increment: inc }, totalStamps: { increment: inc }, stampsExpireAt: stampExpiry, stampsExpiryWarned: false },
        })
      }
      await db.transaction.create({
        data: { cafeId, customerId: referral.referrerCustomerId, type: 'referral_reward', stamps: inc, note: 'Premio por invitar a un amigo' },
      })
      return { rewardType: 'stamps', granted: inc, referrerCustomerId: referral.referrerCustomerId }
    }

    await db.customerCafe.update({
      where: { id: referrerLink.id },
      data: { points: { increment: amount } },
    })
    await db.transaction.create({
      data: { cafeId, customerId: referral.referrerCustomerId, type: 'referral_reward', points: amount, note: 'Premio por invitar a un amigo' },
    })
    return { rewardType: 'points', granted: amount, referrerCustomerId: referral.referrerCustomerId }
  })
}
