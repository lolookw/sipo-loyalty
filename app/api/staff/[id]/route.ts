import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user || !['owner', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const staff = await prisma.cafeStaff.findUnique({
    where: { id },
    include: { cafe: { select: { ownerId: true } } },
  })
  if (!staff) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Verificar que el owner sea dueño de ese café
  if (session.user.role === 'owner') {
    const ownerRecord = await prisma.owner.findUnique({ where: { email: session.user.email! } })
    if (staff.cafe.ownerId !== ownerRecord?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  await prisma.cafeStaff.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
