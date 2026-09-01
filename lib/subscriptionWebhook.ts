// Lógica PURA de qué hacer cuando llega un cobro de Mercado Pago (webhook o el botón "Chequear el
// cobro"), testeable sin red ni DB. El fetch a la API de MP vive en lib/mercadopago.ts.
//
// Cubre alta (primer cobro confirma el tier elegido), renovación mensual, y cobro fallido —
// ver sipo-plan/04-mercado-pago/plan.md §5A-D. Reembolsos/contracargos quedan fuera de alcance
// (§11 del plan).
//
// Importante: acá NUNCA se decide si mandar un mail — eso vive en el cron (ver §7 del plan,
// "ninguno se manda sincrónico"). Esta función solo decide el estado del café; `mpFirstFailureAt`
// lo setea el CRON (no acá) al detectar `mpLastChargeStatus==='rejected'` sin haber avisado
// todavía — así el webhook no necesita saber nada de mails.

import { DEFAULT_PLAN_TIERS, isPlanTier, type PlanTiers } from './plans'
import { addMonths, billingAnchorFrom } from './dates'

export interface CafeChargeState {
  activeUntil: Date | null
  pendingSubscriptionTier: string | null
  mpLastProcessedPaymentId: string | null
  /** Día de facturación del café. null = todavía sin fijar (ver lib/dates.ts). */
  billingAnchorDay?: number | null
}

export interface MpPaymentLike {
  id: string
  status: string | null
}

export type ChargeUpdate = Record<string, unknown>

/**
 * Decide qué actualizar en el café cuando llega un cobro. Devuelve `null` si no corresponde
 * hacer nada (estado intermedio tipo `pending`/`in_process`, o el mismo pago ya procesado).
 */
export function computeChargeOutcome(
  cafe: CafeChargeState,
  payment: MpPaymentLike,
  now: Date,
  tiers: PlanTiers = DEFAULT_PLAN_TIERS,
): ChargeUpdate | null {
  // Idempotencia: MP puede reenviar la misma notificación más de una vez (ver plan §6).
  if (cafe.mpLastProcessedPaymentId === payment.id) return null

  if (payment.status === 'approved') {
    const from = cafe.activeUntil && cafe.activeUntil.getTime() > now.getTime() ? cafe.activeUntil : now
    // El primer cobro de una suscripción fija el día de facturación; los siguientes lo respetan.
    const anchorDay = cafe.billingAnchorDay ?? billingAnchorFrom(from)
    const activeUntil = addMonths(from, 1, anchorDay)

    const base: ChargeUpdate = {
      activeUntil,
      billingAnchorDay: anchorDay,
      mpFirstFailureAt: null, // cualquier cobro aprobado limpia un fallo previo — reactivación automática
      mpLastChargeAt: now,
      mpLastChargeStatus: 'approved',
      mpLastProcessedPaymentId: payment.id,
    }

    // Alta pendiente (primera vez que se confirma este tier) — ver plan §5A.
    if (cafe.pendingSubscriptionTier && isPlanTier(cafe.pendingSubscriptionTier)) {
      const customerLimit = tiers[cafe.pendingSubscriptionTier].customerLimit
      if (customerLimit !== null) {
        return {
          ...base,
          planTier: cafe.pendingSubscriptionTier,
          customerLimit,
          pendingSubscriptionTier: null,
          mpPreapprovalStatus: 'authorized',
        }
      }
    }

    // Renovación normal (café ya activo, no hay alta pendiente) — ver plan §5B.
    return base
  }

  if (payment.status === 'rejected') {
    // No se toca activeUntil ni se decide ningún mail acá — solo se deja constancia del
    // intento. El cron decide si corresponde avisar (ver plan §5C).
    return { mpLastChargeAt: now, mpLastChargeStatus: 'rejected' }
  }

  return null // pending/in_process/otro estado intermedio — esperar al próximo evento
}
