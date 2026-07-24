// Funciones PURAS de estado de plan (sin prisma) — seguras para importar en cliente y servidor.

export type EffectivePlan = 'permanent' | 'active' | 'grace' | 'expired' | 'trial'

type PlanCafe = { planStatus: string; isPermanent: boolean; activeUntil: Date | string | null }
type LimitCafe = PlanCafe & { customerLimit: number }

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

/** ¿Puede aceptar un cliente NUEVO? Permanente/activo/gracia = ilimitado. */
export function canRegisterNewCustomer(cafe: LimitCafe, currentCount: number, graceDays: number, now: Date = new Date()): boolean {
  const plan = getEffectivePlan(cafe, graceDays, now)
  if (plan === 'permanent' || plan === 'active' || plan === 'grace') return true
  return currentCount < cafe.customerLimit
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
