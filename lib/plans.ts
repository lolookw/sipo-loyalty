// Fuente de verdad de los tiers comerciales. "grandfathered" no se vende: es el tier
// de los cafés que ya estaban en la plataforma antes de que existieran los planes pagos.
//
// Los valores de acá son los DEFAULTS. El superadmin puede editar precio y tope de los tiers
// vendibles (+ el gratis) desde el panel; esos overrides viven en la tabla PlanTierConfig y se
// resuelven en lib/planTiers.ts → getPlanTiers(). El código de servidor debe usar getPlanTiers();
// estas constantes quedan como fallback y para los componentes que reciben los tiers por props.

export type PlanTier = 'free' | 'economico' | 'medio' | 'grande' | 'grandfathered'

export type TierConfig = { label: string; customerLimit: number | null; price: number | null }
export type PlanTiers = Record<PlanTier, TierConfig>

export const DEFAULT_PLAN_TIERS: PlanTiers = {
  free:          { label: 'Gratis',    customerLimit: 10,   price: 0 },
  economico:     { label: 'Económico', customerLimit: 50,   price: 15000 },
  medio:         { label: 'Medio',     customerLimit: 250,  price: 24000 },
  grande:        { label: 'Grande',    customerLimit: 1000, price: 35000 },
  grandfathered: { label: 'Legado',    customerLimit: null, price: null },
}

/** @deprecated en servidor usá `getPlanTiers()` (lib/planTiers.ts) para respetar los overrides. */
export const PLAN_TIERS = DEFAULT_PLAN_TIERS

// Tiers que se pueden activar manualmente desde el panel de superadmin (excluye free y grandfathered,
// que no son "activaciones" sino el estado por defecto / un caso especial de backfill).
export const SELLABLE_TIERS: PlanTier[] = ['economico', 'medio', 'grande']

/** Tiers cuyo precio/tope el superadmin puede editar (grandfathered no se vende ni se topea). */
export const EDITABLE_TIERS: PlanTier[] = ['free', 'economico', 'medio', 'grande']

export function isPlanTier(value: string): value is PlanTier {
  return value in DEFAULT_PLAN_TIERS
}
