import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const role = session.user.role

  if (role === 'owner') {
    const owner = await prisma.owner.findUnique({ where: { email: session.user.email! } })
    if (!owner) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    const valid = await bcrypt.compare(currentPassword, owner.password)
    if (!valid) return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
    await prisma.owner.update({
      where: { id: owner.id },
      data: { password: await bcrypt.hash(newPassword, 12), mustChangePassword: false },
    })
  } else if (role === 'cashier') {
    const staff = await prisma.cafeStaff.findUnique({ where: { email: session.user.email! } })
    if (!staff) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    const valid = await bcrypt.compare(currentPassword, staff.password)
    if (!valid) return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
    await prisma.cafeStaff.update({
      where: { id: staff.id },
      data: { password: await bcrypt.hash(newPassword, 12), mustChangePassword: false },
    })
  } else {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}
