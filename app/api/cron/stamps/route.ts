import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { isInactiveEligible, isCompletedEligible, buildReengagementEmailHtml, DEFAULT_INACTIVE_MESSAGE, DEFAULT_COMPLETED_MESSAGE } from '@/lib/reengagement'
import { buildBroadcastEmailHtml, BROADCAST_BATCH_PER_RUN } from '@/lib/broadcast'

const DAY = 24 * 60 * 60 * 1000
const WARN_WINDOW = 7 * DAY // avisar cuando faltan <= 7 días
const REENGAGEMENT_BATCH = 100 // tope por café por corrida (además del tope global de sellos-por-vencer)

// GET /api/cron/stamps — job diario. Protegido por CRON_SECRET (Vercel Cron manda el Bearer).
// 1) Expira sellos vencidos.  2) Avisa por email los que vencen dentro de 7 días.
// 3) Reactivación por inactividad.  4) Reactivación por tarjeta completa sin canjear. (opt-in por café)
// 5) Difusión: drena BroadcastRecipients pendientes en lotes (tope global — cuota de Resend compartida).
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

  // 3) Reactivación por inactividad — solo cafés que lo activaron, un corte de días propio por café.
  let reengagedInactive = 0
  const inactiveCafes = await prisma.cafe.findMany({
    where: { reengagementInactiveEnabled: true },
    select: { id: true, slug: true, name: true, reengagementInactiveDays: true, reengagementInactiveMessage: true },
  })
  for (const c of inactiveCafes) {
    const candidates = await prisma.customerCafe.findMany({
      where: {
        cafeId: c.id,
        lastStampAt: { not: null, lte: new Date(now.getTime() - c.reengagementInactiveDays * DAY) },
        reengagementInactiveSentAt: null,
        stampsExpireAt: null, // ya le corre el aviso más específico de vencimiento de sellos (F5) — no duplicar
      },
      include: { customer: { select: { email: true } } },
      take: REENGAGEMENT_BATCH,
    })
    const { subject, html } = buildReengagementEmailHtml({
      cafeName: c.name, cafeSlug: c.slug, baseUrl,
      message: c.reengagementInactiveMessage ?? DEFAULT_INACTIVE_MESSAGE,
    })
    for (const link of candidates) {
      if (!isInactiveEligible(link, c.reengagementInactiveDays, now)) continue // doble check defensivo
      if (resend && link.customer.email) {
        try {
          await resend.emails.send({ from, to: link.customer.email, subject, html })
        } catch (e) {
          console.error('cron reengagement (inactive) email error:', e)
          continue
        }
      }
      await prisma.customerCafe.update({ where: { id: link.id }, data: { reengagementInactiveSentAt: now } })
      reengagedInactive++
    }
  }

  // 4) Reactivación por tarjeta completa sin canjear — mismo patrón que el paso 3.
  let reengagedCompleted = 0
  const completedCafes = await prisma.cafe.findMany({
    where: { reengagementCompletedEnabled: true },
    select: { id: true, slug: true, name: true, stampsRequired: true, reengagementCompletedDays: true, reengagementCompletedMessage: true },
  })
  for (const c of completedCafes) {
    const candidates = await prisma.customerCafe.findMany({
      where: {
        cafeId: c.id,
        stamps: { gte: c.stampsRequired },
        cardCompletedAt: { not: null, lte: new Date(now.getTime() - c.reengagementCompletedDays * DAY) },
        reengagementCompletedSentAt: null,
      },
      include: { customer: { select: { email: true } } },
      take: REENGAGEMENT_BATCH,
    })
    const { subject, html } = buildReengagementEmailHtml({
      cafeName: c.name, cafeSlug: c.slug, baseUrl,
      message: c.reengagementCompletedMessage ?? DEFAULT_COMPLETED_MESSAGE,
    })
    for (const link of candidates) {
      if (!isCompletedEligible(link, c.stampsRequired, c.reengagementCompletedDays, now)) continue
      if (resend && link.customer.email) {
        try {
          await resend.emails.send({ from, to: link.customer.email, subject, html })
        } catch (e) {
          console.error('cron reengagement (completed) email error:', e)
          continue
        }
      }
      await prisma.customerCafe.update({ where: { id: link.id }, data: { reengagementCompletedSentAt: now } })
      reengagedCompleted++
    }
  }

  // 5) Difusión — drena en orden FIFO entre cafés, tope GLOBAL por corrida (cuota de Resend
  // compartida por toda la plataforma, incluido el OTP de login: nunca hay que dejarla sin margen).
  let broadcastSent = 0
  const inFlightBroadcasts = await prisma.broadcast.findMany({
    where: { status: { in: ['pending', 'sending'] } },
    orderBy: { createdAt: 'asc' },
    include: { cafe: { select: { name: true, slug: true } } },
  })
  for (const b of inFlightBroadcasts) {
    if (broadcastSent >= BROADCAST_BATCH_PER_RUN) break
    if (b.status === 'pending') await prisma.broadcast.update({ where: { id: b.id }, data: { status: 'sending' } })

    const budget = BROADCAST_BATCH_PER_RUN - broadcastSent
    const pending = await prisma.broadcastRecipient.findMany({
      where: { broadcastId: b.id, sentAt: null },
      include: { customer: { select: { email: true } } },
      orderBy: { id: 'asc' },
      take: budget,
    })
    for (const rec of pending) {
      const link = await prisma.customerCafe.findUnique({
        where: { customerId_cafeId: { customerId: rec.customerId, cafeId: b.cafeId } },
        select: { id: true, marketingOptOut: true },
      })
      // Doble check: si se dio de baja DESPUÉS de componer la difusión, no le mandamos igual.
      if (!link || link.marketingOptOut) {
        await prisma.broadcastRecipient.update({ where: { id: rec.id }, data: { sentAt: now } })
        continue
      }
      if (resend && rec.customer.email) {
        const { subject, html } = buildBroadcastEmailHtml({
          cafeName: b.cafe.name, subject: b.subject, message: b.message,
          unsubscribeUrl: `${baseUrl}/unsubscribe/${link.id}`,
        })
        try {
          await resend.emails.send({ from, to: rec.customer.email, subject, html })
        } catch (e) {
          console.error('cron broadcast email error:', e)
          continue // no marcamos sentAt → reintenta la próxima corrida
        }
      }
      await prisma.broadcastRecipient.update({ where: { id: rec.id }, data: { sentAt: now } })
      await prisma.broadcast.update({ where: { id: b.id }, data: { sentCount: { increment: 1 } } })
      broadcastSent++
    }

    const remaining = await prisma.broadcastRecipient.count({ where: { broadcastId: b.id, sentAt: null } })
    if (remaining === 0) await prisma.broadcast.update({ where: { id: b.id }, data: { status: 'done', completedAt: now } })
  }

  return NextResponse.json({
    ok: true, expired: expired.count, bonusExpired: bonusExpired.count, warned,
    reengagedInactive, reengagedCompleted, broadcastSent,
  })
}
