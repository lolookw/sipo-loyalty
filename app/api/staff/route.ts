import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { normalizeEmail } from '@/lib/utils'

// Crear cajero
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['owner', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { name, email, password, cafeId } = await req.json()
  if (!name || !email || !password || !cafeId) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }
  const normalizedEmail = normalizeEmail(email)

  // Verificar que el owner sea dueño de ese café (superadmin puede crear en cualquier café)
  if (session.user.role === 'owner') {
    const cafe = await prisma.cafe.findFirst({
      where: { id: cafeId, owner: { email: session.user.email! } },
    })
    if (!cafe) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const [ownerEmailExists, staffEmailExists] = await Promise.all([
    prisma.owner.findUnique({ where: { email: normalizedEmail } }),
    prisma.cafeStaff.findUnique({ where: { email: normalizedEmail } }),
  ])
  if (ownerEmailExists || staffEmailExists) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const staff = await prisma.cafeStaff.create({
    data: { name, email: normalizedEmail, password: hashedPassword, cafeId, mustChangePassword: true },
  })

  return NextResponse.json({ id: staff.id, name: staff.name, email: staff.email, createdAt: staff.createdAt })
}
