// Lógica de los emails de reactivación (dos triggers independientes, ver Cafe.reengagement*).
// Elegibilidad = lógica pura (testeable); el HTML del email también es puro (Resend vive en el cron).

const DAY = 24 * 60 * 60 * 1000

export const DEFAULT_INACTIVE_MESSAGE =
  'Hace un tiempo que no te vemos por acá y te extrañamos. Pasate cuando quieras a tomar algo rico y seguir sumando sellos.'

export const DEFAULT_COMPLETED_MESSAGE =
  '¡Tu tarjeta ya está completa! Pasate cuando quieras a canjear tu recompensa — te está esperando.'

export interface ReengagementLinkLike {
  stamps: number
  lastStampAt: Date | null
  cardCompletedAt: Date | null
  stampsExpireAt: Date | null
  reengagementInactiveSentAt: Date | null
  reengagementCompletedSentAt: Date | null
}

// Si al cliente todavía le corre una cuenta regresiva de vencimiento de sellos (F5) para ESTE café,
// no le mandamos además el genérico de inactividad — gana el aviso más específico (van a perder
// sellos reales) sobre el más blando ("te extrañamos"). Si el café no usa vencimiento de sellos,
// stampsExpireAt nunca se setea (ver lib/purchase.ts) así que esto no le cambia nada.
export function isInactiveEligible(link: ReengagementLinkLike, days: number, now: Date): boolean {
  if (!link.lastStampAt || link.reengagementInactiveSentAt || link.stampsExpireAt) return false
  return link.lastStampAt.getTime() <= now.getTime() - days * DAY
}

export function isCompletedEligible(link: ReengagementLinkLike, stampsRequired: number, days: number, now: Date): boolean {
  if (link.stamps < stampsRequired || !link.cardCompletedAt || link.reengagementCompletedSentAt) return false
  return link.cardCompletedAt.getTime() <= now.getTime() - days * DAY
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildReengagementEmailHtml(opts: {
  cafeName: string
  cafeSlug: string
  message: string
  baseUrl: string
}): { subject: string; html: string } {
  const bodyHtml = escapeHtml(opts.message).replace(/\n/g, '<br>')
  return {
    subject: `${opts.cafeName} te espera ☕`,
    html: `
      <div style="font-family: sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 24px; background: #faf7f2;">
        <h2 style="font-size: 22px; color: #43352C; margin: 0 0 8px;">${escapeHtml(opts.cafeName)}</h2>
        <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">${bodyHtml}</p>
        <a href="${opts.baseUrl}/${opts.cafeSlug}/loyalty" style="display: inline-block; background: #43352C; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 22px; border-radius: 12px;">
          Ver mi tarjeta
        </a>
        <p style="color: #C0B4A8; font-size: 12px; margin: 24px 0 0;">Sipo · Cada café cuenta.</p>
      </div>
    `,
  }
}
