import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelSubscription } from '@/lib/mercadopago'

// Cancelación self-service del dueño (ver plan §5E). Corta el cobro automático a futuro, pero
// NO toca activeUntil: el café sigue con su tope pago hasta la fecha que ya pagó, y recién ahí
// cae solo a gratis por el mecanismo de siempre (getEffectivePlan).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role === 'cashier')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, mpPreapprovalId: true, activeUntil: true },
  })
  if (!cafe) return NextResponse.json({ error: 'Cafetería no encontrada' }, { status: 404 })
  if (session.user.role !== 'superadmin' && cafe.ownerId !== session.user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (!cafe.mpPreapprovalId)
    return NextResponse.json({ error: 'Este café no tiene una suscripción activa.' }, { status: 400 })

  const cancelled = await cancelSubscription(cafe.mpPreapprovalId)
  if (!cancelled.ok) {
    console.error('Cancelación rechazada por MP:', cafe.mpPreapprovalId, cancelled.reason)
    return NextResponse.json({ error: 'No pudimos cancelar en Mercado Pago. Probá de nuevo en un rato.' }, { status: 502 })
  }

  await prisma.cafe.update({
    where: { id: cafe.id },
    data: {
      mpPreapprovalStatus: 'cancelled',
      // Se sueltan los pendientes: no tiene sentido sincronizar el monto de algo ya cancelado,
      // ni dejar un alta a medio confirmar colgada (ver plan §5E).
      pendingSubscriptionTier: null,
      pendingSubscriptionAt: null,
      planChangeRequestedTier: null,
      planChangeRequestedAt: null,
      mpFirstFailureAt: null,
    },
  })

  return NextResponse.json({ ok: true, activeUntil: cafe.activeUntil })
}
