// Funciones PURAS de estado de plan (sin prisma) — seguras para importar en cliente y servidor.

import { PLAN_TIERS, type PlanTier } from './plans'

export type EffectivePlan = 'permanent' | 'active' | 'grace' | 'expired' | 'trial'

type PlanCafe = { planStatus: string; isPermanent: boolean; activeUntil: Date | string | null }
type LimitCafe = PlanCafe & { customerLimit: number; planTier: string }

const DAY = 24 * 60 * 60 * 1000

function toDate(d: Date | string | null): Date | null {
  if (!d) return null
  return d instanceof Date ? d : new Date(d)
}

/** Estado efectivo del plan de un café en un momento dado. */
export function getEffectivePlan(cafe: PlanCafe, graceDays: number, now: Date = new Date()): EffectivePlan {
  if (cafe.isPermanent) return 'permanent'
  if (cafe.planStatus === 'active') {
    const until = toDate(cafe.activeUntil)
    if (!until) return 'active'
    if (now < until) return 'active'
    if (now.getTime() < until.getTime() + graceDays * DAY) return 'grace'
    return 'expired'
  }
  if (cafe.planStatus === 'expired') return 'expired'
  return 'trial'
}

/** ¿El servicio está limitado (plan gratuito)? grace SÍ opera pleno; expired vuelve a limitado. */
export function isServiceLimited(plan: EffectivePlan): boolean {
  return plan === 'trial' || plan === 'expired'
}

/**
 * ¿Puede aceptar un cliente NUEVO? El tope lo define el tier (free/económico/medio/grande),
 * no si está pago o no — un café en "Grande" está topeado en 1000 aunque esté activo.
 * "grandfathered" (cafés previos a los planes pagos) queda sin tope. Un plan vencido degrada
 * al tope del plan gratuito, no al de su tier pago (si no, dejar de pagar no restringiría nada).
 */
export function canRegisterNewCustomer(
  cafe: LimitCafe,
  currentCount: number,
  graceDays: number,
  now: Date = new Date(),
  // Tope del plan gratuito vigente. Editable por el superadmin (ver lib/planTiers.ts), por eso se
  // puede pasar; si no viene, se usa el default de lib/plans.ts.
  freeLimit: number = PLAN_TIERS.free.customerLimit ?? 10,
): boolean {
  if (cafe.planTier === 'grandfathered') return true
  const plan = getEffectivePlan(cafe, graceDays, now)
  const limit = plan === 'expired' ? freeLimit : cafe.customerLimit
  return currentCount < limit
}

/**
 * % de uso del tope de clientes del tier actual, para el indicador de capacidad en vivo
 * del dashboard del dueño (ver sipo-plan/04-mercado-pago/plan.md §5I). `null` para
 * grandfathered (sin tope, el indicador no aplica).
 */
export function capacityPercent(cafe: { planTier: string; customerLimit: number }, currentCount: number): number | null {
  if (cafe.planTier === 'grandfathered' || cafe.customerLimit <= 0) return null
  return Math.round((currentCount / cafe.customerLimit) * 100)
}

/** Etiqueta legible del tier comercial (distinto del estado de pago — ver planLabel). */
export function tierLabel(planTier: string): string {
  return PLAN_TIERS[planTier as PlanTier]?.label ?? planTier
}

/** Etiqueta legible + color para la UI. */
export function planLabel(plan: EffectivePlan): { text: string; tone: 'green' | 'amber' | 'red' | 'zinc' } {
  switch (plan) {
    case 'permanent': return { text: 'Permanente', tone: 'green' }
    case 'active':    return { text: 'Activo', tone: 'green' }
    case 'grace':     return { text: 'En gracia (por vencer)', tone: 'amber' }
    case 'expired':   return { text: 'Vencido', tone: 'red' }
    case 'trial':     return { text: 'Prueba', tone: 'zinc' }
  }
}
