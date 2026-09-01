import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidMpWebhookSignature, getMpPayment, getMpInvoice, type MpChargeInfo } from '@/lib/mercadopago'
import { computeChargeOutcome } from '@/lib/subscriptionWebhook'

// Webhook de Mercado Pago. Cubre alta (primer cobro confirma el tier), renovación mensual y
// cobro fallido (ver lib/subscriptionWebhook.ts). El "subscription_preapproval" (cambios de
// status de la suscripción en sí, ej. cancelación) se ignora a propósito — no aporta nada que
// el flujo de pagos no cubra ya, ver plan §11 (reembolsos/contracargos fuera de alcance).
//
// Un cobro de suscripción puede reportarse por DOS topics (Mercado Pago recomienda tildar los dos
// para integraciones de Suscripciones): "payment" (recurso clásico) y
// "subscription_authorized_payment" (recurso Invoice, propio de Preapproval). Se manejan ambos —
// si llegaran los dos para el mismo cobro, la idempotencia de computeChargeOutcome evita
// aplicarlo dos veces.
//
// El payload del webhook es solo un aviso de "cambió algo" — SIEMPRE se re-consulta el estado real
// a la API de MP antes de actuar (ver plan §6), nunca se confía en datos de negocio del body.
export async function POST(req: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.error('MP_WEBHOOK_SECRET no configurado — rechazando webhook')
    return NextResponse.json({ error: 'No configurado' }, { status: 503 })
  }

  const dataId = req.nextUrl.searchParams.get('data.id') ?? req.nextUrl.searchParams.get('id')
  const valid = isValidMpWebhookSignature(
    { xSignature: req.headers.get('x-signature'), xRequestId: req.headers.get('x-request-id'), dataId },
    secret,
  )
  if (!valid) return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const type = body?.type as string | undefined
  if (!dataId) return NextResponse.json({ ok: true, ignored: true })

  let charge: MpChargeInfo | null = null
  if (type === 'payment') charge = await getMpPayment(dataId)
  else if (type === 'subscription_authorized_payment') charge = await getMpInvoice(dataId)
  else return NextResponse.json({ ok: true, ignored: true })

  if (!charge) return NextResponse.json({ ok: true, ignored: true })

  // Preferir el match por preapproval_id (más confiable, no depende de que external_reference se
  // haya propagado del preapproval al invoice/pago) y caer a external_reference si no vino.
  const select = { id: true, activeUntil: true, pendingSubscriptionTier: true, mpLastProcessedPaymentId: true }
  const cafe = charge.preapprovalId
    ? await prisma.cafe.findFirst({ where: { mpPreapprovalId: charge.preapprovalId }, select })
    : charge.externalReference
      ? await prisma.cafe.findUnique({ where: { id: charge.externalReference }, select })
      : null
  if (!cafe) return NextResponse.json({ ok: true, ignored: true })

  const update = computeChargeOutcome(cafe, { id: charge.paymentId, status: charge.status }, new Date())
  if (!update) return NextResponse.json({ ok: true, applied: false })

  await prisma.cafe.update({ where: { id: cafe.id }, data: update })
  return NextResponse.json({ ok: true, applied: true })
}
