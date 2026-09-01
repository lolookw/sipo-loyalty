import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildPeopleCsv } from '@/lib/customerExport'

// CSV de todas las personas de la plataforma (una vez cada una, aunque estén en varias
// cafeterías). Solo superadmin. Respeta el filtro de búsqueda que esté aplicado en la pantalla.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const where = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
    : {}

  const people = await prisma.customer.findMany({
    where,
    select: {
      name: true, email: true, phone: true, birthdate: true, favoriteDrink: true, createdAt: true,
      cafes: { select: { cafe: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const fecha = new Date().toISOString().slice(0, 10)
  return new NextResponse(buildPeopleCsv(people), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sipo-clientes-${fecha}.csv"`,
    },
  })
}
