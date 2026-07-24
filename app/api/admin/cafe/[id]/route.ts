import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH — acciones de plan del café (solo superadmin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  const now = new Date()

  const cafe = await prisma.cafe.findUnique({ where: { id } })
  if (!cafe) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  let data: Record<string, unknown>
  switch (action) {
    case 'activate_month': {
      const months = Math.min(Math.max(Number(body.months) || 1, 1), 24)
      // Si ya tiene una fecha futura, extiende desde ahí (apila); si no, desde hoy
      const base = cafe.activeUntil && cafe.activeUntil > now ? new Date(cafe.activeUntil) : new Date(now)
      base.setMonth(base.getMonth() + months)
      data = { planStatus: 'active', isPermanent: false, activeUntil: base, activatedAt: now }
      break
    }
    case 'activate_permanent':
      data = { planStatus: 'active', isPermanent: true, activeUntil: null, activatedAt: now }
      break
    case 'set_trial':
      data = { planStatus: 'trial', isPermanent: false, activeUntil: null }
      break
    case 'expire':
      data = { planStatus: 'expired', isPermanent: false, activeUntil: null }
      break
    default:
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  const updated = await prisma.cafe.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const cafe = await prisma.cafe.findUnique({ where: { id } })
    if (!cafe) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    // Eliminar en orden por dependencias
    await prisma.transaction.deleteMany({ where: { cafeId: id } })
    await prisma.customerCafe.deleteMany({ where: { cafeId: id } })
    await prisma.reward.deleteMany({ where: { cafeId: id } })
    await prisma.cafeStaff.deleteMany({ where: { cafeId: id } })
    await prisma.cafe.delete({ where: { id } })

    // Si el owner ya no tiene cafés, lo eliminamos también
    const remaining = await prisma.cafe.count({ where: { ownerId: cafe.ownerId } })
    if (remaining === 0) {
      await prisma.owner.delete({ where: { id: cafe.ownerId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
