// Fase 4: sincronizar el monto que Mercado Pago le cobra a cada café contra el precio vigente
// de su tier (lib/plans.ts). Lógica PURA — el PUT a MP y los emails viven en el cron.
//
// Cómo funciona: los precios viven en código. Cuando se cambia el precio de un tier y se
// deploya, cada café de ese tier queda con `mpSubscriptionAmount` (lo que MP cobra hoy) distinto
// del precio nuevo. El cron detecta esa diferencia solo — no hace falta apretar ningún botón —
// avisa al dueño, y recién N días después aplica el monto nuevo en MP (ver plan §5G).

import { DEFAULT_PLAN_TIERS, isPlanTier, type PlanTiers } from './plans'

/** Días de aviso previo antes de que un precio nuevo empiece a cobrarse (editable en el panel). */
export const PRICE_CHANGE_NOTICE_DAYS = 14

export interface BillingSyncCafe {
  planTier: string
  mpPreapprovalId: string | null
  mpSubscriptionAmount: number | null
  pendingBillingSyncAt: Date | null
}

export type BillingSyncAction =
  | { kind: 'none' }
  /** El precio del tier cambió: avisar al dueño y agendar la aplicación para dentro de N días. */
  | { kind: 'schedule'; newAmount: number; applyAt: Date }
  /** Llegó la fecha: aplicar el monto nuevo en MP. */
  | { kind: 'apply'; newAmount: number }
  /** Había un cambio agendado pero el precio volvió a coincidir → cancelar el aviso. */
  | { kind: 'cancel_scheduled' }

/**
 * Decide qué hacer con un café respecto al precio de su plan. Ignora cafés sin suscripción de MP
 * (los activados a mano no se tocan) y tiers sin precio (grandfathered/free).
 */
export function computeBillingSync(
  cafe: BillingSyncCafe,
  now: Date,
  tiers: PlanTiers = DEFAULT_PLAN_TIERS,
  noticeDays = PRICE_CHANGE_NOTICE_DAYS,
): BillingSyncAction {
  if (!cafe.mpPreapprovalId) return { kind: 'none' }
  if (!isPlanTier(cafe.planTier)) return { kind: 'none' }

  const target = tiers[cafe.planTier].price
  if (target === null || target === 0) return { kind: 'none' } // free/grandfathered no se cobran

  // Sin registro de lo que MP cobra hoy no podemos comparar nada (café previo a este campo):
  // no se toca, para no arriesgar un PUT con un monto que quizás ya es el correcto.
  if (cafe.mpSubscriptionAmount === null) return { kind: 'none' }

  if (cafe.mpSubscriptionAmount === target) {
    // El precio coincide. Si había un cambio agendado, ya no corresponde (se revirtió el precio).
    return cafe.pendingBillingSyncAt ? { kind: 'cancel_scheduled' } : { kind: 'none' }
  }

  // Hay diferencia real de precio.
  if (!cafe.pendingBillingSyncAt) {
    const applyAt = new Date(now.getTime() + noticeDays * 24 * 60 * 60 * 1000)
    return { kind: 'schedule', newAmount: target, applyAt }
  }

  if (cafe.pendingBillingSyncAt.getTime() <= now.getTime()) {
    return { kind: 'apply', newAmount: target }
  }

  return { kind: 'none' } // agendado pero todavía no llegó la fecha
}
