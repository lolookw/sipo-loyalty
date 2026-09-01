// Emails de facturación de Mercado Pago. Elegibilidad = lógica pura (testeable); el HTML también
// es puro (Resend vive en el cron) — mismo patrón que lib/reengagement.ts y lib/capacityWarning.ts.
// Ver sipo-plan/04-mercado-pago/plan.md §5C, §7.

export interface CafeFailureState {
  mpLastChargeStatus: string | null
  mpFirstFailureAt: Date | null
  mpPreapprovalId: string | null
}

/**
 * ¿Corresponde mandar el mail de "no pudimos cobrarte" ahora? Solo la PRIMERA vez que se detecta
 * el fallo (mpFirstFailureAt null) — reintentos posteriores de MP para el mismo ciclo no generan
 * mails nuevos. `mpFirstFailureAt` lo setea el cron al mandar este mail, no el webhook (ver
 * lib/subscriptionWebhook.ts) — así este chequeo también sirve para decidir CUÁNDO setearlo.
 */
export function isPaymentFailedEmailEligible(cafe: CafeFailureState): boolean {
  return cafe.mpPreapprovalId !== null && cafe.mpLastChargeStatus === 'rejected' && cafe.mpFirstFailureAt === null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const MP_SUBSCRIPTIONS_URL = 'https://www.mercadopago.com.ar/subscriptions'

/** Cáscara de marca compartida por todos los emails de facturación. */
function shell(cafeName: string, body: string, cta?: { href: string; label: string }): string {
  return `
      <div style="font-family: sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 24px; background: #faf7f2;">
        <h2 style="font-size: 22px; color: #43352C; margin: 0 0 8px;">${escapeHtml(cafeName)}</h2>
        <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">${body}</p>
        ${cta ? `<a href="${cta.href}" style="display: inline-block; background: #43352C; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 22px; border-radius: 12px;">${escapeHtml(cta.label)}</a>` : ''}
        <p style="color: #C0B4A8; font-size: 12px; margin: 24px 0 0;">Sipo · Cada café cuenta.</p>
      </div>
    `
}

const money = (n: number) => `$${n.toLocaleString('es-AR')}`

export function buildPaymentFailedEmailHtml(opts: { cafeName: string }): { subject: string; html: string } {
  return {
    subject: 'No pudimos procesar el cobro de tu plan Sipo',
    html: shell(
      opts.cafeName,
      'No pudimos procesar el cobro automático de tu suscripción a Sipo. Mercado Pago va a ' +
      'reintentarlo solo en los próximos días — si tu tarjeta venció o cambió, actualizala vos ' +
      'para que el próximo intento salga bien.',
      { href: MP_SUBSCRIPTIONS_URL, label: 'Actualizar método de pago' },
    ),
  }
}

/** #1 — el primer cobro se confirmó y el plan quedó activo (cierra el estado "confirmando…"). */
export function buildWelcomeEmailHtml(opts: { cafeName: string; tierLabel: string; customerLimit: number; amount: number; baseUrl: string; cafeSlug: string }): { subject: string; html: string } {
  return {
    subject: `Tu plan ${opts.tierLabel} ya está activo`,
    html: shell(
      opts.cafeName,
      `Listo, tu plan <strong>${escapeHtml(opts.tierLabel)}</strong> ya está activo. ` +
      `Ahora podés tener hasta <strong>${opts.customerLimit} clientes</strong> registrados. ` +
      `Se renueva solo cada mes por ${money(opts.amount)}, y podés cancelarlo cuando quieras desde tu panel.`,
      { href: `${opts.baseUrl}/${opts.cafeSlug}/admin/settings`, label: 'Ir a mi panel' },
    ),
  }
}

/** #3 — el plan venció y el café volvió al tope del plan gratuito. */
export function buildPlanExpiredEmailHtml(opts: { cafeName: string; freeLimit: number; baseUrl: string; cafeSlug: string }): { subject: string; html: string } {
  return {
    subject: 'Tu cafetería volvió al plan gratuito',
    html: shell(
      opts.cafeName,
      `Tu plan venció, así que tu cafetería volvió al plan gratuito. Tus clientes actuales y sus ` +
      `sellos siguen intactos — lo único que cambia es que no vas a poder registrar clientes nuevos ` +
      `más allá de ${opts.freeLimit}. Podés reactivar tu plan cuando quieras desde tu panel.`,
      { href: `${opts.baseUrl}/${opts.cafeSlug}/admin/settings`, label: 'Reactivar mi plan' },
    ),
  }
}

/** #5 — aviso previo de cambio de precio (ver plan §5G y lib/mpBilling.ts). */
export function buildPriceChangeEmailHtml(opts: { cafeName: string; tierLabel: string; oldAmount: number; newAmount: number; applyAt: Date }): { subject: string; html: string } {
  const fecha = opts.applyAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  const subio = opts.newAmount > opts.oldAmount
  return {
    subject: `Cambia el precio de tu plan ${opts.tierLabel}`,
    html: shell(
      opts.cafeName,
      `Te avisamos con tiempo: a partir del <strong>${fecha}</strong> el plan ` +
      `<strong>${escapeHtml(opts.tierLabel)}</strong> pasa de ${money(opts.oldAmount)} a ` +
      `<strong>${money(opts.newAmount)}</strong> por mes. ` +
      `Hasta esa fecha se te sigue cobrando ${money(opts.oldAmount)}. ` +
      (subio
        ? 'Si preferís no seguir, podés cancelar tu suscripción desde tu panel antes de esa fecha, sin costo.'
        : 'No tenés que hacer nada — el ajuste se aplica solo.'),
      { href: MP_SUBSCRIPTIONS_URL, label: 'Ver mi suscripción' },
    ),
  }
}

/** Premio por referir otra cafetería: un mes gratis cuando la referida empieza a pagar. */
export function buildReferralRewardEmailHtml(opts: { cafeName: string; referredCafeName: string; nuevoVencimiento: Date }): { subject: string; html: string } {
  const fecha = opts.nuevoVencimiento.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  return {
    subject: 'Te regalamos un mes por recomendar Sipo',
    html: shell(
      opts.cafeName,
      `Gracias por recomendarnos. <strong>${escapeHtml(opts.referredCafeName)}</strong> se sumó a Sipo y ya ` +
      `está con su plan activo, así que te regalamos <strong>un mes</strong>: tu plan ahora vence el ` +
      `<strong>${fecha}</strong>.<br><br>Si conocés otra cafetería que le pueda servir, contanos — no hay tope.`,
    ),
  }
}

/** #7 — aviso al equipo (no al dueño) de que un café pidió cambiar de plan. */
export function buildPlanChangeRequestEmailHtml(opts: { cafeName: string; cafeSlug: string; currentTier: string; requestedTier: string; ownerEmail: string }): { subject: string; html: string } {
  return {
    subject: `${opts.cafeName} pidió cambiar de plan`,
    html: shell(
      'Pedido de cambio de plan',
      `<strong>${escapeHtml(opts.cafeName)}</strong> (/${escapeHtml(opts.cafeSlug)}) quiere pasar de ` +
      `<strong>${escapeHtml(opts.currentTier)}</strong> a <strong>${escapeHtml(opts.requestedTier)}</strong>.<br><br>` +
      `Contacto del dueño: ${escapeHtml(opts.ownerEmail)}`,
    ),
  }
}
