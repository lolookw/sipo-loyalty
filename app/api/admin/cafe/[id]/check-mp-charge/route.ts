import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPreapproval, getLatestInvoice } from '@/lib/mercadopago'
import { computeChargeOutcome } from '@/lib/subscriptionWebhook'

// Botón "Chequear el cobro" de superadmin (ver plan §5D) — mismo código que el webhook, pero
// pedido a demanda contra la API de MP para el caso en que el webhook se haya perdido o demorado.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cafe = await prisma.cafe.findUnique({
    where: { id },
    select: { id: true, mpPreapprovalId: true, activeUntil: true, pendingSubscriptionTier: true, mpLastProcessedPaymentId: true, billingAnchorDay: true },
  })
  if (!cafe) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!cafe.mpPreapprovalId)
    return NextResponse.json({ error: 'Este café no tiene una suscripción de Mercado Pago' }, { status: 400 })

  const preapproval = await getPreapproval(cafe.mpPreapprovalId)
  if (preapproval?.status) {
    await prisma.cafe.update({ where: { id: cafe.id }, data: { mpPreapprovalStatus: preapproval.status } })
  }

  const charge = await getLatestInvoice(cafe.mpPreapprovalId)
  if (!charge) return NextResponse.json({ ok: true, applied: false, message: 'No encontramos ningún cobro para esta suscripción todavía.' })

  const update = computeChargeOutcome(cafe, { id: charge.paymentId, status: charge.status }, new Date())
  if (!update) {
    return NextResponse.json({
      ok: true, applied: false,
      message: `Sin novedades — el último cobro que vemos (${charge.status ?? 'desconocido'}) ya estaba reflejado.`,
    })
  }

  const updated = await prisma.cafe.update({ where: { id: cafe.id }, data: update })
  return NextResponse.json({
    ok: true, applied: true,
    message: charge.status === 'approved' ? 'Encontramos un cobro aprobado — el plan se actualizó.' : 'Encontramos un cobro rechazado, se dejó registrado.',
    cafe: { planTier: updated.planTier, customerLimit: updated.customerLimit, activeUntil: updated.activeUntil, mpLastChargeStatus: updated.mpLastChargeStatus },
  })
}
