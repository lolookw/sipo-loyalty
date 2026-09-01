import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { isInactiveEligible, isCompletedEligible, buildReengagementEmailHtml, DEFAULT_INACTIVE_MESSAGE, DEFAULT_COMPLETED_MESSAGE } from '@/lib/reengagement'
import { buildBroadcastEmailHtml, BROADCAST_BATCH_PER_RUN } from '@/lib/broadcast'
import { isCapacityWarningEligible, shouldResetCapacityWarning, buildCapacityWarningEmailHtml } from '@/lib/capacityWarning'
import {
  isPaymentFailedEmailEligible, buildPaymentFailedEmailHtml, buildWelcomeEmailHtml,
  buildPlanExpiredEmailHtml, buildPriceChangeEmailHtml, buildPlanChangeRequestEmailHtml,
  buildReferralRewardEmailHtml,
} from '@/lib/mpEmails'
import { computeBillingSync } from '@/lib/mpBilling'
import { updateSubscriptionAmount, getLatestInvoice, cancelSubscription } from '@/lib/mercadopago'
import { computeChargeOutcome } from '@/lib/subscriptionWebhook'
import { getEffectivePlan, tierLabel } from '@/lib/planStatus'
import { SELLABLE_TIERS, type PlanTier } from '@/lib/plans'
import { getPlanTiers } from '@/lib/planTiers'
import { getPlatformConfig } from '@/lib/platformConfig'
import { addMonths } from '@/lib/dates'

const DAY = 24 * 60 * 60 * 1000
const WARN_WINDOW = 7 * DAY // avisar cuando faltan <= 7 días
const PENDING_SUBSCRIPTION_TIMEOUT_HOURS = 24 // altas a medio confirmar que se limpian solas
const REENGAGEMENT_BATCH = 100 // tope por café por corrida (además del tope global de sellos-por-vencer)

// El nombre del café lo escribe el dueño y termina dentro del HTML de un email. Todos los
// builders de lib/ ya escapan; este email se arma acá a mano, así que escapa igual.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// GET /api/cron/stamps — job diario. Protegido por CRON_SECRET (Vercel Cron manda el Bearer).
// 1) Expira sellos vencidos.  2) Avisa por email los que vencen dentro de 7 días.
// 3) Reactivación por inactividad.  4) Reactivación por tarjeta completa sin canjear. (opt-in por café)
// 5) Difusión: drena BroadcastRecipients pendientes en lotes (tope global — cuota de Resend compartida).
// 6) Degradación a gratis + aviso de capacidad (~80% del tope) — barrido diario de todos los cafés.
// 7) Cobro de MP fallido: avisa una sola vez por ciclo de fallos (Fase 2 del plan de Mercado Pago).
// 8) Bienvenida tras confirmarse el primer cobro.  9) Sincronización de precio con aviso previo.
// 10) Aviso al equipo de pedidos de cambio de plan. (Fases 4 y 5 del plan de Mercado Pago)
// 11) Limpieza de altas a medio confirmar (checkout abandonado) pasadas 24h.
// 12) Referidos entre cafeterias: un mes gratis a quien refirio, cuando la referida empieza a pagar.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  // 1) Expirar: sellos con deadline pasado → resetear tarjeta
  const expired = await prisma.customerCafe.updateMany({
    where: { stampsExpireAt: { lt: now }, stamps: { gt: 0 } },
    // También se limpia el tracking de "tarjeta completa": si la tarjeta se vació por vencimiento,
    // dejar `cardCompletedAt` con la fecha vieja impedía para siempre volver a marcarla completa
    // (lib/purchase.ts solo la setea cuando está en null) y con eso el aviso de "vení a canjear"
    // no volvía a salir nunca más para esa persona.
    data: {
      stamps: 0, stampsExpireAt: null, stampsExpiryWarned: false,
      cardCompletedAt: null, reengagementCompletedSentAt: null,
    },
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
  // Ojo: NEXTAUTH_URL tiene que ser la URL canónica pública (con www). Arma tanto el back_url de
  // Mercado Pago como TODOS los links de los emails — si apunta al dominio de Vercel, los clientes
  // reciben links a vercel.app. El fallback lleva www a propósito: sipo.ar hace 307 y hay clientes
  // (webhooks, algunos mails) que no siguen redirects.
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://www.sipo.ar'

  let warned = 0
  for (const c of soon) {
    const email = c.customer.email
    const daysLeft = Math.max(1, Math.ceil(((c.stampsExpireAt as Date).getTime() - now.getTime()) / DAY))

    if (resend && email) {
      try {
        await resend.emails.send({
          from,
          to: email,
          subject: `Tus sellos en ${c.cafe.name} están por vencer`, // el asunto es texto plano
          html: `
            <div style="font-family: sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 24px; background: #faf7f2;">
              <h2 style="font-size: 22px; color: #43352C; margin: 0 0 8px;">Che, no pierdas tus sellos ☕</h2>
              <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Tenés <strong>${c.stamps} ${c.stamps === 1 ? 'sello' : 'sellos'}</strong> en ${escapeHtml(c.cafe.name)}
                que ${daysLeft === 1 ? 'vencen mañana' : `vencen en ${daysLeft} días`}.
                Pasá a tomar un café y sumá el que te falta para tu premio.
              </p>
              <a href="${baseUrl}/${encodeURIComponent(c.cafe.slug)}/loyalty" style="display: inline-block; background: #43352C; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 22px; border-radius: 12px;">
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

  // 6) Barrido diario de todos los cafés con tope (no grandfathered): aviso de degradación a
  // gratis (§5C) + aviso de capacidad (§5I). Van juntos en un solo loop para poder aplicar la
  // regla de precedencia del plan: si un café recibió HOY el mail de "volviste a gratis", no se
  // le manda además el de capacidad — ese mail ya explica que el tope bajó.
  let capacityWarned = 0
  let capacityReset = 0
  let planExpiredWarned = 0
  const { capacityWarningPercent, graceDays, priceChangeNoticeDays } = await getPlatformConfig()
  const tiers = await getPlanTiers()
  const freeLimit = tiers.free.customerLimit ?? 10
  const cafesWithLimit = await prisma.cafe.findMany({
    where: { planTier: { not: 'grandfathered' } },
    select: {
      id: true, slug: true, name: true, planTier: true, customerLimit: true, capacityWarningSentAt: true,
      planStatus: true, isPermanent: true, activeUntil: true, planExpiredNoticeSentAt: true,
      owner: { select: { email: true } },
      _count: { select: { customers: true } },
    },
  })
  for (const c of cafesWithLimit) {
    const count = c._count.customers

    // 6a) ¿Venció el plan de un café que estaba en un tier pago? Avisar una sola vez.
    const effective = getEffectivePlan(c, graceDays, now)
    const wasPaid = SELLABLE_TIERS.includes(c.planTier as PlanTier)
    let degradedThisRun = false
    if (effective === 'expired' && wasPaid && !c.planExpiredNoticeSentAt) {
      if (resend && c.owner.email) {
        const { subject, html } = buildPlanExpiredEmailHtml({ cafeName: c.name, freeLimit, baseUrl, cafeSlug: c.slug })
        try {
          await resend.emails.send({ from, to: c.owner.email, subject, html })
        } catch (e) {
          console.error('cron plan expired email error:', e)
          continue // sin marcar → reintenta la próxima corrida
        }
      }
      await prisma.cafe.update({ where: { id: c.id }, data: { planExpiredNoticeSentAt: now } })
      planExpiredWarned++
      degradedThisRun = true
    } else if (effective !== 'expired' && c.planExpiredNoticeSentAt) {
      // Volvió a estar activo (reactivación/renovación) → re-armar para el próximo vencimiento.
      await prisma.cafe.update({ where: { id: c.id }, data: { planExpiredNoticeSentAt: null } })
    }

    // 6b) Aviso de capacidad — se saltea si ya se le avisó recién de la degradación (redundante).
    if (degradedThisRun) continue
    if (isCapacityWarningEligible(c, count, capacityWarningPercent)) {
      if (resend && c.owner.email) {
        const { subject, html } = buildCapacityWarningEmailHtml({
          cafeName: c.name, cafeSlug: c.slug, currentCount: count, customerLimit: c.customerLimit,
          isTopTier: c.planTier === 'grande', baseUrl,
        })
        try {
          await resend.emails.send({ from, to: c.owner.email, subject, html })
        } catch (e) {
          console.error('cron capacity warning email error:', e)
          continue // no marcamos sentAt → reintenta la próxima corrida
        }
      }
      await prisma.cafe.update({ where: { id: c.id }, data: { capacityWarningSentAt: now } })
      capacityWarned++
    } else if (shouldResetCapacityWarning(c, count, capacityWarningPercent)) {
      await prisma.cafe.update({ where: { id: c.id }, data: { capacityWarningSentAt: null } })
      capacityReset++
    }
  }

  // 7) Cobro de MP fallido — avisa UNA vez por ciclo de fallos. `mpFirstFailureAt` lo setea este
  // pase (no el webhook, ver lib/subscriptionWebhook.ts) — así el throttle vive junto al envío.
  let paymentFailedWarned = 0
  const cafesWithFailedCharge = await prisma.cafe.findMany({
    where: { mpPreapprovalId: { not: null }, mpLastChargeStatus: 'rejected', mpFirstFailureAt: null },
    select: { id: true, name: true, mpLastChargeStatus: true, mpFirstFailureAt: true, mpPreapprovalId: true, owner: { select: { email: true } } },
  })
  for (const c of cafesWithFailedCharge) {
    if (!isPaymentFailedEmailEligible(c)) continue
    if (resend && c.owner.email) {
      const { subject, html } = buildPaymentFailedEmailHtml({ cafeName: c.name })
      try {
        await resend.emails.send({ from, to: c.owner.email, subject, html })
      } catch (e) {
        console.error('cron payment failed email error:', e)
        continue // no marcamos mpFirstFailureAt → reintenta la próxima corrida
      }
    }
    await prisma.cafe.update({ where: { id: c.id }, data: { mpFirstFailureAt: now } })
    paymentFailedWarned++
  }

  // 8) Bienvenida: el primer cobro ya se confirmó (el alta dejó de estar pendiente) y todavía no
  // se avisó. Cierra el estado "confirmando tu suscripción…" que ve el dueño en su panel.
  let welcomeSent = 0
  const cafesReciénActivados = await prisma.cafe.findMany({
    where: {
      mpPreapprovalId: { not: null }, pendingSubscriptionTier: null,
      mpSubscriptionAmount: { not: null }, mpWelcomeSentAt: null,
    },
    select: { id: true, slug: true, name: true, planTier: true, customerLimit: true, mpSubscriptionAmount: true, owner: { select: { email: true } } },
  })
  for (const c of cafesReciénActivados) {
    if (!SELLABLE_TIERS.includes(c.planTier as PlanTier)) continue
    if (resend && c.owner.email) {
      const { subject, html } = buildWelcomeEmailHtml({
        cafeName: c.name, tierLabel: tierLabel(c.planTier), customerLimit: c.customerLimit,
        amount: c.mpSubscriptionAmount!, baseUrl, cafeSlug: c.slug,
      })
      try {
        await resend.emails.send({ from, to: c.owner.email, subject, html })
      } catch (e) {
        console.error('cron welcome email error:', e)
        continue
      }
    }
    await prisma.cafe.update({ where: { id: c.id }, data: { mpWelcomeSentAt: now } })
    welcomeSent++
  }

  // 9) Sincronización de precio (§5G): si el precio del tier cambió en lib/plans.ts, avisar al
  // dueño con PRICE_CHANGE_NOTICE_DAYS de anticipación y recién ahí aplicarlo en MP.
  let priceChangeScheduled = 0
  let priceChangeApplied = 0
  const cafesConSuscripcion = await prisma.cafe.findMany({
    where: { mpPreapprovalId: { not: null }, mpSubscriptionAmount: { not: null } },
    select: {
      id: true, name: true, planTier: true, mpPreapprovalId: true,
      mpSubscriptionAmount: true, pendingBillingSyncAt: true, owner: { select: { email: true } },
    },
  })
  for (const c of cafesConSuscripcion) {
    const action = computeBillingSync(c, now, tiers, priceChangeNoticeDays)
    if (action.kind === 'schedule') {
      if (resend && c.owner.email) {
        const { subject, html } = buildPriceChangeEmailHtml({
          cafeName: c.name, tierLabel: tierLabel(c.planTier),
          oldAmount: c.mpSubscriptionAmount!, newAmount: action.newAmount, applyAt: action.applyAt,
        })
        try {
          await resend.emails.send({ from, to: c.owner.email, subject, html })
        } catch (e) {
          console.error('cron price change notice error:', e)
          continue // sin agendar → se reintenta mañana (el aviso previo no puede saltearse)
        }
      }
      await prisma.cafe.update({ where: { id: c.id }, data: { pendingBillingSyncAt: action.applyAt } })
      priceChangeScheduled++
    } else if (action.kind === 'apply') {
      const ok = await updateSubscriptionAmount(c.mpPreapprovalId!, action.newAmount)
      if (!ok) continue // se reintenta mañana; no se toca mpSubscriptionAmount hasta confirmar
      await prisma.cafe.update({
        where: { id: c.id },
        data: { mpSubscriptionAmount: action.newAmount, pendingBillingSyncAt: null },
      })
      priceChangeApplied++
    } else if (action.kind === 'cancel_scheduled') {
      await prisma.cafe.update({ where: { id: c.id }, data: { pendingBillingSyncAt: null } })
    }
  }

  // 10) Pedido de cambio de plan: avisar al equipo (no al dueño) una sola vez por pedido.
  let planChangeNotified = 0
  const pedidos = await prisma.cafe.findMany({
    where: { planChangeRequestedTier: { not: null }, planChangeNotifiedAt: null },
    select: { id: true, name: true, slug: true, planTier: true, planChangeRequestedTier: true, owner: { select: { email: true } } },
  })
  if (pedidos.length > 0) {
    const { contactEmail } = await getPlatformConfig()
    for (const c of pedidos) {
      if (resend && contactEmail) {
        const { subject, html } = buildPlanChangeRequestEmailHtml({
          cafeName: c.name, cafeSlug: c.slug,
          currentTier: tierLabel(c.planTier), requestedTier: tierLabel(c.planChangeRequestedTier!),
          ownerEmail: c.owner.email,
        })
        try {
          await resend.emails.send({ from, to: contactEmail, subject, html })
        } catch (e) {
          console.error('cron plan change request email error:', e)
          continue
        }
      }
      await prisma.cafe.update({ where: { id: c.id }, data: { planChangeNotifiedAt: now } })
      planChangeNotified++
    }
  }

  // 11) Altas que quedaron a medio confirmar: si alguien arrancó el alta y nunca terminó de pagar,
  // `pendingSubscriptionTier` quedaba seteado para siempre y el panel del dueño se trababa en
  // "Confirmando tu suscripción…" sin poder reintentar. Pasadas 24h se limpia solo — pero primero
  // se chequea si hubo un cobro aprobado que el webhook se perdió, para no cancelar algo que sí pagó.
  let staleSubscriptionsCleared = 0
  let staleSubscriptionsRecovered = 0
  const stale = await prisma.cafe.findMany({
    where: {
      pendingSubscriptionTier: { not: null },
      pendingSubscriptionAt: { lt: new Date(now.getTime() - PENDING_SUBSCRIPTION_TIMEOUT_HOURS * 60 * 60 * 1000) },
    },
    select: { id: true, mpPreapprovalId: true, activeUntil: true, pendingSubscriptionTier: true, mpLastProcessedPaymentId: true, billingAnchorDay: true },
  })
  for (const c of stale) {
    if (c.mpPreapprovalId) {
      const charge = await getLatestInvoice(c.mpPreapprovalId)
      if (charge?.status === 'approved') {
        // Sí pagó: el webhook se perdió. Se aplica el cobro en vez de cancelar.
        const update = computeChargeOutcome(c, { id: charge.paymentId, status: charge.status }, now, tiers)
        if (update) {
          await prisma.cafe.update({ where: { id: c.id }, data: update })
          staleSubscriptionsRecovered++
          continue
        }
      }
      await cancelSubscription(c.mpPreapprovalId)
    }
    await prisma.cafe.update({
      where: { id: c.id },
      data: { pendingSubscriptionTier: null, pendingSubscriptionAt: null, mpPreapprovalStatus: 'cancelled' },
    })
    staleSubscriptionsCleared++
  }

  // 12) Referidos entre cafeterías: cuando una cafetería recomendada por otra EMPIEZA A PAGAR
  // (pasa a un tier vendible), la que la mandó gana un mes gratis. Se acredita una sola vez por
  // cafetería referida, sin tope de cuántas puede traer. Se detecta acá y no en el alta para que
  // valga igual si empezó a pagar por Mercado Pago o si la activaste vos a mano.
  let referralMonthsGranted = 0
  const referidas = await prisma.cafe.findMany({
    where: { referredByCafeId: { not: null }, referralRewardGrantedAt: null },
    select: {
      id: true, name: true, planTier: true,
      referredByCafe: {
        select: {
          id: true, name: true, isPermanent: true, planTier: true, activeUntil: true,
          billingAnchorDay: true, owner: { select: { email: true } },
        },
      },
    },
  })
  for (const ref of referidas) {
    if (!SELLABLE_TIERS.includes(ref.planTier as PlanTier)) continue // todavía no paga
    const padrino = ref.referredByCafe
    if (!padrino) continue

    // A un café sin vencimiento (permanente o legado) un mes extra no le cambia nada: se marca
    // como acreditado igual para no reevaluarlo en cada corrida.
    const aplica = !padrino.isPermanent && padrino.planTier !== 'grandfathered'
    if (aplica) {
      const base = padrino.activeUntil && padrino.activeUntil.getTime() > now.getTime() ? new Date(padrino.activeUntil) : new Date(now)
      const desde = addMonths(base, 1, padrino.billingAnchorDay)
      // Acreditar el mes y marcar la referida como ya premiada van juntos: si se cortaba entre
      // los dos updates, la corrida siguiente volvía a regalar otro mes por el mismo referido.
      await prisma.$transaction([
        prisma.cafe.update({
          where: { id: padrino.id },
          data: { planStatus: 'active', activeUntil: desde },
        }),
        prisma.cafe.update({ where: { id: ref.id }, data: { referralRewardGrantedAt: now } }),
      ])
      if (resend && padrino.owner.email) {
        const { subject, html } = buildReferralRewardEmailHtml({
          cafeName: padrino.name, referredCafeName: ref.name, nuevoVencimiento: desde,
        })
        try {
          await resend.emails.send({ from, to: padrino.owner.email, subject, html })
        } catch (e) {
          console.error('cron referral reward email error:', e)
        }
      }
      referralMonthsGranted++
      continue
    }
    // No aplica (el padrino no tiene vencimiento): se marca igual para no reevaluarlo cada día.
    await prisma.cafe.update({ where: { id: ref.id }, data: { referralRewardGrantedAt: now } })
  }

  return NextResponse.json({
    ok: true, expired: expired.count, bonusExpired: bonusExpired.count, warned,
    reengagedInactive, reengagedCompleted, broadcastSent, capacityWarned, capacityReset,
    paymentFailedWarned, planExpiredWarned, welcomeSent,
    priceChangeScheduled, priceChangeApplied, planChangeNotified,
    staleSubscriptionsCleared, staleSubscriptionsRecovered, referralMonthsGranted,
  })
}
