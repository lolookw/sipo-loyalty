import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const DAY = 24 * 60 * 60 * 1000
const WARN_WINDOW = 7 * DAY // avisar cuando faltan <= 7 días

// GET /api/cron/stamps — job diario. Protegido por CRON_SECRET (Vercel Cron manda el Bearer).
// 1) Expira sellos vencidos.  2) Avisa por email los que vencen dentro de 7 días.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  // 1) Expirar: sellos con deadline pasado → resetear tarjeta
  const expired = await prisma.customerCafe.updateMany({
    where: { stampsExpireAt: { lt: now }, stamps: { gt: 0 } },
    data: { stamps: 0, stampsExpireAt: null, stampsExpiryWarned: false },
  })

  // 1b) Expirar puntos de regalo (campañas bonus_points) vencidos
  const bonusExpired = await prisma.customerCafe.updateMany({
    where: { bonusExpireAt: { lt: now }, bonusPoints: { gt: 0 } },
    data: { bonusPoints: 0, bonusExpireAt: null },
  })

  // 2) Avisar: vencen dentro de la ventana, tienen sellos y no fueron avisados aún
  const soon = await prisma.customerCafe.findMany({
    where: {
      stamps: { gt: 0 },
      stampsExpiryWarned: false,
      stampsExpireAt: { gte: now, lte: new Date(now.getTime() + WARN_WINDOW) },
    },
    include: {
      customer: { select: { email: true, name: true } },
      cafe: { select: { name: true, slug: true } },
    },
    take: 300, // tope por corrida
  })

  const apiKey = process.env.RESEND_API_KEY
  const resend = apiKey ? new Resend(apiKey) : null
  const from = process.env.RESEND_FROM_EMAIL ?? 'Sipo <onboarding@resend.dev>'
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://sipo.ar'

  let warned = 0
  for (const c of soon) {
    const email = c.customer.email
    const daysLeft = Math.max(1, Math.ceil(((c.stampsExpireAt as Date).getTime() - now.getTime()) / DAY))

    if (resend && email) {
      try {
        await resend.emails.send({
          from,
          to: email,
          subject: `Tus sellos en ${c.cafe.name} están por vencer`,
          html: `
            <div style="font-family: sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 24px; background: #faf7f2;">
              <h2 style="font-size: 22px; color: #43352C; margin: 0 0 8px;">Che, no pierdas tus sellos ☕</h2>
              <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Tenés <strong>${c.stamps} ${c.stamps === 1 ? 'sello' : 'sellos'}</strong> en ${c.cafe.name}
                que ${daysLeft === 1 ? 'vencen mañana' : `vencen en ${daysLeft} días`}.
                Pasá a tomar un café y sumá el que te falta para tu premio.
              </p>
              <a href="${baseUrl}/${c.cafe.slug}/loyalty" style="display: inline-block; background: #43352C; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 22px; border-radius: 12px;">
                Ver mi tarjeta
              </a>
              <p style="color: #C0B4A8; font-size: 12px; margin: 24px 0 0;">Sipo · Cada café cuenta.</p>
            </div>
          `,
        })
      } catch (e) {
        console.error('cron stamp warn email error:', e)
        continue // no marcamos como avisado si el email falló → reintenta la próxima corrida
      }
    }

    await prisma.customerCafe.update({ where: { id: c.id }, data: { stampsExpiryWarned: true } })
    warned++
  }

  return NextResponse.json({ ok: true, expired: expired.count, bonusExpired: bonusExpired.count, warned })
}
