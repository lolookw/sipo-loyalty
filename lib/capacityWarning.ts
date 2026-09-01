// Aviso proactivo de capacidad (~80% del tope de clientes, antes del bloqueo al 100%).
// Elegibilidad = lógica pura (testeable); el HTML del email también es puro (Resend vive en el cron).
// Ver sipo-plan/04-mercado-pago/plan.md §5I — barrido diario contra TODOS los cafés, no enganchado
// en el alta de cliente: un día de latencia es aceptable y evita tocar el flujo de registro.

export interface CapacityCafeLike {
  planTier: string
  customerLimit: number
  capacityWarningSentAt: Date | null
}

/** ¿Corresponde mandar el aviso ahora? Nunca para grandfathered ni si ya se avisó (se re-arma solo). */
export function isCapacityWarningEligible(cafe: CapacityCafeLike, currentCount: number, warningPercent: number): boolean {
  if (cafe.planTier === 'grandfathered' || cafe.customerLimit <= 0) return false
  if (cafe.capacityWarningSentAt) return false
  return (currentCount / cafe.customerLimit) * 100 >= warningPercent
}

/** ¿Corresponde re-armar el aviso (volvió a bajar del umbral, ej. bajas de clientes o upgrade de tier)? */
export function shouldResetCapacityWarning(cafe: CapacityCafeLike, currentCount: number, warningPercent: number): boolean {
  if (cafe.planTier === 'grandfathered' || cafe.customerLimit <= 0) return !!cafe.capacityWarningSentAt
  if (!cafe.capacityWarningSentAt) return false
  return (currentCount / cafe.customerLimit) * 100 < warningPercent
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildCapacityWarningEmailHtml(opts: {
  cafeName: string
  cafeSlug: string
  currentCount: number
  customerLimit: number
  isTopTier: boolean // "grande" — no hay a dónde upgradear, el copy no puede ofrecerlo
  baseUrl: string
}): { subject: string; html: string } {
  const { cafeName, cafeSlug, currentCount, customerLimit, isTopTier, baseUrl } = opts
  const cta = isTopTier
    ? `<p style="color: #6B6B6B; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
         Ya estás en nuestro plan más grande. Escribinos si necesitás más lugar del que tiene hoy — vemos qué podemos armar.
       </p>`
    : `<a href="${baseUrl}/${cafeSlug}/admin/settings" style="display: inline-block; background: #43352C; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 22px; border-radius: 12px;">
         Ver planes y mejorar
       </a>`
  return {
    subject: `${cafeName} está por llegar a su tope de clientes`,
    html: `
      <div style="font-family: sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 24px; background: #faf7f2;">
        <h2 style="font-size: 22px; color: #43352C; margin: 0 0 8px;">${escapeHtml(cafeName)}</h2>
        <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Tenés <strong>${currentCount} de ${customerLimit}</strong> clientes registrados en tu plan actual.
          Cuando llegues al tope, no vas a poder sumar clientes nuevos hasta que subas de plan.
        </p>
        ${cta}
        <p style="color: #C0B4A8; font-size: 12px; margin: 24px 0 0;">Sipo · Cada café cuenta.</p>
      </div>
    `,
  }
}
