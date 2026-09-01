import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { normalizeEmail } from '@/lib/utils'
import { validateCafeSlug } from '@/lib/slug'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { ownerName, ownerEmail, ownerPassword, cafeName, cafeSlug, referredByCafeId } = await req.json()

    if (!ownerName || !ownerEmail || !ownerPassword || !cafeName || !cafeSlug) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const normalizedOwnerEmail = normalizeEmail(ownerEmail)
    const [ownerEmailExists, staffEmailExists] = await Promise.all([
      prisma.owner.findUnique({ where: { email: normalizedOwnerEmail } }),
      prisma.cafeStaff.findUnique({ where: { email: normalizedOwnerEmail } }),
    ])
    if (ownerEmailExists || staffEmailExists) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }

    const parsedSlug = validateCafeSlug(cafeSlug)
    if (!parsedSlug.ok) return NextResponse.json({ error: parsedSlug.error }, { status: 400 })
    const { slug } = parsedSlug

    const slugExists = await prisma.cafe.findUnique({ where: { slug } })
    if (slugExists) {
      return NextResponse.json({ error: 'Ese slug ya está en uso' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(ownerPassword, 12)

    const owner = await prisma.owner.create({
      data: {
        name: ownerName,
        email: normalizedOwnerEmail,
        password: hashedPassword,
        mustChangePassword: true,
        cafes: {
          create: {
            name: cafeName,
            slug,
            // Si llegó recomendada por otra cafetería, se guarda para acreditarle el mes de
            // regalo a la que la mandó cuando esta empiece a pagar (ver el cron).
            ...(referredByCafeId ? { referredByCafeId } : {}),
          },
        },
      },
    })

    return NextResponse.json({ success: true, ownerId: owner.id })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
