// Bono de bienvenida (campaña signup_bonus): puntos y/o sellos al vincularse a un café por
// primera vez. Se llama desde los 3 puntos donde puede nacer un CustomerCafe nuevo: la loyalty
// page (POST /api/customer/public), el alta por API (POST /api/v1/customers) y la compra que
// da de alta en el momento (lib/purchase.ts, caja o API con auto_register).
// Nunca bloquea el alta: se envuelve en try/catch en cada call site.
import type { Cafe, PrismaClient } from '@prisma/client'
import { signupBonusFor, bonusExpiryDate, availableBonus } from './campaigns'

const DAY = 24 * 60 * 60 * 1000

export type SignupBonusGrant = { points: number; stamps: number } | null

export async function grantSignupBonus(
  db: PrismaClient,
  cafe: Pick<Cafe, 'id' | 'stampsRequired' | 'stampExpiryDays'>,
  link: { id: string; customerId: string },
  now: Date = new Date(),
): Promise<SignupBonusGrant> {
  const linkId = link.id
  const campaigns = await db.campaign.findMany({
    where: { cafeId: cafe.id, type: 'signup_bonus', active: true, startsAt: { lte: now }, endsAt: { gte: now } },
  })
  const { points, stamps, expiryDays, campaign } = signupBonusFor(campaigns, now)
  if (points <= 0 && stamps <= 0) return null

  return db.$transaction(async tx => {
    let grantedStamps = 0
    if (stamps > 0) {
      const fresh = await tx.customerCafe.findUniqueOrThrow({ where: { id: linkId }, select: { stamps: true } })
      grantedStamps = Math.min(Math.round(stamps), Math.max(0, cafe.stampsRequired - fresh.stamps))
      if (grantedStamps > 0) {
        const stampExpiry = cafe.stampExpiryDays > 0 ? new Date(now.getTime() + cafe.stampExpiryDays * DAY) : null
        await tx.customerCafe.update({
          where: { id: linkId },
          data: {
            stamps: { increment: grantedStamps },
            totalStamps: { increment: grantedStamps },
            stampsExpireAt: stampExpiry,
            stampsExpiryWarned: false,
          },
        })
      }
    }

    if (points > 0) {
      const fresh = await tx.customerCafe.findUniqueOrThrow({ where: { id: linkId }, select: { bonusPoints: true, bonusExpireAt: true } })
      const stale = fresh.bonusPoints > 0 && availableBonus(fresh, now) === 0
      await tx.customerCafe.update({
        where: { id: linkId },
        data: {
          bonusPoints: stale ? points : { increment: points },
          bonusExpireAt: bonusExpiryDate(expiryDays, now),
        },
      })
    }

    if (grantedStamps > 0 || points > 0) {
      await tx.transaction.create({
        data: {
          cafeId: cafe.id,
          customerId: link.customerId,
          type: 'signup_bonus',
          points: points > 0 ? points : undefined,
          stamps: grantedStamps > 0 ? grantedStamps : undefined,
          note: `Bono de bienvenida: ${campaign?.name ?? ''}`,
        },
      })
    }

    return { points, stamps: grantedStamps }
  })
}
