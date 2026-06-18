import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
