// Resolución de los tiers: defaults de lib/plans.ts + overrides que el superadmin editó desde
// el panel (tabla PlanTierConfig). Todo el código de SERVIDOR que necesite precio o tope debe
// usar `getPlanTiers()`; los componentes de cliente los reciben por props.

import { prisma } from './prisma'
import { DEFAULT_PLAN_TIERS, EDITABLE_TIERS, isPlanTier, type PlanTier, type PlanTiers } from './plans'

/** Aplica overrides sobre los defaults. Puro — testeable sin DB. */
export function mergePlanTiers(overrides: Array<{ tier: string; customerLimit: number; price: number }>): PlanTiers {
  const merged: PlanTiers = {
    free: { ...DEFAULT_PLAN_TIERS.free },
    economico: { ...DEFAULT_PLAN_TIERS.economico },
    medio: { ...DEFAULT_PLAN_TIERS.medio },
    grande: { ...DEFAULT_PLAN_TIERS.grande },
    grandfathered: { ...DEFAULT_PLAN_TIERS.grandfathered },
  }
  for (const o of overrides) {
    // Solo tiers conocidos y editables: grandfathered nunca se topea ni se cobra.
    if (!isPlanTier(o.tier) || !EDITABLE_TIERS.includes(o.tier)) continue
    merged[o.tier as PlanTier] = { ...merged[o.tier as PlanTier], customerLimit: o.customerLimit, price: o.price }
  }
  return merged
}

/** Tiers vigentes (defaults + overrides de la DB). */
export async function getPlanTiers(): Promise<PlanTiers> {
  const overrides = await prisma.planTierConfig.findMany({
    select: { tier: true, customerLimit: true, price: true },
  })
  return mergePlanTiers(overrides)
}
