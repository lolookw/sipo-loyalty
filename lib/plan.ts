import type { Cafe } from '@prisma/client'
import { prisma } from './prisma'
import { getPlatformConfig } from './platformConfig'
import { canRegisterNewCustomer } from './planStatus'
import { getPlanTiers } from './planTiers'

// Re-export de las funciones puras para consumo del lado servidor
export { getEffectivePlan, canRegisterNewCustomer, isServiceLimited, planLabel, tierLabel } from './planStatus'
export type { EffectivePlan } from './planStatus'

type LimitCafe = Pick<Cafe, 'planStatus' | 'isPermanent' | 'activeUntil' | 'customerLimit' | 'planTier'>

/**
 * Chequeo async listo para endpoints: un cliente YA vinculado siempre pasa;
 * uno nuevo se valida contra el límite del plan.
 */
export async function cafeCanAcceptCustomer(
  cafe: LimitCafe & Pick<Cafe, 'id'>,
  customerEmail: string,
): Promise<boolean> {
  const existing = await prisma.customerCafe.findFirst({
    where: { cafeId: cafe.id, customer: { email: customerEmail } },
    select: { id: true },
  })
  if (existing) return true
  const count = await prisma.customerCafe.count({ where: { cafeId: cafe.id } })
  const { graceDays } = await getPlatformConfig()
  // El tope del plan gratuito es editable desde el panel: se lee vigente, no el default de código.
  const tiers = await getPlanTiers()
  return canRegisterNewCustomer(cafe, count, graceDays, new Date(), tiers.free.customerLimit ?? undefined)
}
