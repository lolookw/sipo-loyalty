// Lógica PURA de campañas (sin prisma) — usada por /api/transaction y testeable en _test/.

const DAY = 24 * 60 * 60 * 1000

export interface CampaignLike {
  name: string
  type: string // "points_multiplier" | "stamp_multiplier" | "bonus_points"
  multiplier: number | null
  bonusPoints: number | null
  bonusExpiryDays: number
  startsAt: Date
  endsAt: Date
  active: boolean
}

export const CAMPAIGN_TYPES = ['points_multiplier', 'stamp_multiplier', 'bonus_points'] as const

export function isCampaignLive(c: CampaignLike, now: Date): boolean {
  return c.active && c.startsAt <= now && c.endsAt >= now
}

/** Multiplicador efectivo para un tipo. Si hay varias campañas vivas, gana la mayor (no se apilan). */
export function effectiveMultiplier(
  campaigns: CampaignLike[],
  type: 'points_multiplier' | 'stamp_multiplier',
  now: Date,
): { multiplier: number; campaign: CampaignLike | null } {
  let best: CampaignLike | null = null
  for (const c of campaigns) {
    if (c.type !== type || !isCampaignLive(c, now)) continue
    const m = c.multiplier ?? 1
    if (m > 1 && m > (best?.multiplier ?? 1)) best = c
  }
  return { multiplier: best?.multiplier ?? 1, campaign: best }
}

/** Puntos de regalo por compra: suman todas las campañas bonus vivas; la vigencia más larga manda. */
export function bonusPointsFor(
  campaigns: CampaignLike[],
  now: Date,
): { bonus: number; expiryDays: number; campaign: CampaignLike | null } {
  let bonus = 0
  let expiryDays = 0
  let campaign: CampaignLike | null = null
  for (const c of campaigns) {
    if (c.type !== 'bonus_points' || !isCampaignLive(c, now)) continue
    const b = c.bonusPoints ?? 0
    if (b <= 0) continue
    bonus += b
    expiryDays = Math.max(expiryDays, c.bonusExpiryDays)
    if (!campaign || b > (campaign.bonusPoints ?? 0)) campaign = c
  }
  return { bonus, expiryDays, campaign }
}

/** Sellos a otorgar en un stamp_add según campañas (mínimo 1, entero). */
export function stampsToGrant(campaigns: CampaignLike[], now: Date): { stamps: number; campaign: CampaignLike | null } {
  const { multiplier, campaign } = effectiveMultiplier(campaigns, 'stamp_multiplier', now)
  return { stamps: Math.max(1, Math.round(multiplier)), campaign }
}

/** Puntos ganados por una compra aplicando el multiplicador vivo. */
export function pointsToGrant(
  amount: number,
  pointsPerPeso: number,
  campaigns: CampaignLike[],
  now: Date,
): { points: number; campaign: CampaignLike | null } {
  const { multiplier, campaign } = effectiveMultiplier(campaigns, 'points_multiplier', now)
  return { points: Math.floor(amount * pointsPerPeso * multiplier), campaign }
}

/** Puntos de regalo aún válidos de un cliente (0 si el bucket venció). */
export function availableBonus(
  link: { bonusPoints: number; bonusExpireAt: Date | null },
  now: Date,
): number {
  if (link.bonusPoints <= 0) return 0
  if (link.bonusExpireAt && link.bonusExpireAt < now) return 0
  return link.bonusPoints
}

/** Cómo repartir un canje entre el bucket de regalo (vence primero, se gasta primero) y los puntos comunes. */
export function splitRedeem(
  cost: number,
  regularPoints: number,
  link: { bonusPoints: number; bonusExpireAt: Date | null },
  now: Date,
): { fromBonus: number; fromRegular: number; enough: boolean } {
  const bonus = availableBonus(link, now)
  const fromBonus = Math.min(bonus, cost)
  const fromRegular = cost - fromBonus
  return { fromBonus, fromRegular, enough: regularPoints >= fromRegular }
}

export function bonusExpiryDate(expiryDays: number, now: Date): Date {
  return new Date(now.getTime() + expiryDays * DAY)
}
