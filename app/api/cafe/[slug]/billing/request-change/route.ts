import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SELLABLE_TIERS, isPlanTier } from '@/lib/plans'

// Pedido de cambio de tier del dueño (ver plan §5F). NO ejecuta el cambio: solo lo deja
// registrado para que el superadmin lo aplique a mano desde /admin. Se usa tanto para bajar
// como para subir entre tiers pagos — automatizar el cambio de monto del preapproval quedó
// pendiente de verificar que no dispare un cobro inmediato (plan §5G, TODO).
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role === 'cashier')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cafe = await prisma.cafe.findUnique({ where: { slug }, select: { id: true, ownerId: true, planTier: true } })
  if (!cafe) return NextResponse.json({ error: 'Cafetería no encontrada' }, { status: 404 })
  if (session.user.role !== 'superadmin' && cafe.ownerId !== session.user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const tier = String(body.tier ?? '')
  if (!isPlanTier(tier) || !SELLABLE_TIERS.includes(tier))
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  if (tier === cafe.planTier)
    return NextResponse.json({ error: 'Ya estás en ese plan.' }, { status: 400 })

  await prisma.cafe.update({
    where: { id: cafe.id },
    data: { planChangeRequestedTier: tier, planChangeRequestedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
