// Mailing de difusión: HTML del email (puro, testeable). El envío en sí (Resend + queries) vive en
// el cron; la creación del Broadcast + sus recipients vive en la API route.

export const BROADCAST_BATCH_PER_RUN = 40 // tope por corrida de cron — deja margen al resto de emails de la plataforma (OTP incluido) en el plan Free de Resend

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildBroadcastEmailHtml(opts: {
  cafeName: string
  subject: string
  message: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const bodyHtml = escapeHtml(opts.message).replace(/\n/g, '<br>')
  return {
    subject: opts.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 24px; background: #faf7f2;">
        <h2 style="font-size: 22px; color: #43352C; margin: 0 0 8px;">${escapeHtml(opts.cafeName)}</h2>
        <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">${bodyHtml}</p>
        <p style="color: #C0B4A8; font-size: 11px; margin: 24px 0 0; line-height: 1.6;">
          Sipo · Cada café cuenta.<br>
          Recibiste esto porque estás registrado en ${escapeHtml(opts.cafeName)}.
          <a href="${opts.unsubscribeUrl}" style="color: #C0B4A8; text-decoration: underline;">Dejar de recibir estos avisos</a>.
        </p>
      </div>
    `,
  }
}
