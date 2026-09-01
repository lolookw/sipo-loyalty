import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Genera una contraseña temporal para el dueño de un café (solo superadmin). Se devuelve UNA sola
// vez en claro para poder pasársela; en la DB solo queda el hash. El dueño queda obligado a
// cambiarla en su próximo login (mustChangePassword), mismo flujo que un alta nueva.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin l/I/O/0/1

function generateTempPassword(length = 12): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cafe = await prisma.cafe.findUnique({
    where: { id },
    select: { id: true, ownerId: true, owner: { select: { email: true, name: true } } },
  })
  if (!cafe) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const tempPassword = generateTempPassword()
  await prisma.owner.update({
    where: { id: cafe.ownerId },
    data: { password: await bcrypt.hash(tempPassword, 12), mustChangePassword: true },
  })

  return NextResponse.json({ ok: true, email: cafe.owner.email, name: cafe.owner.name, tempPassword })
}
