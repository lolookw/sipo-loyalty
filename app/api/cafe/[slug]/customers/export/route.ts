import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildCustomerCsv } from '@/lib/customerExport'
import { getCafeBySlugIfAuthorized } from '@/lib/cafeAuth'

// GET /api/cafe/[slug]/customers/export — descarga CSV con la tabla de clientes del café.
// Mismo umbral que la página /[slug]/admin/customers de donde cuelga el botón: dueño o
// superadmin. El chequeo viejo comparaba el slug de la sesión y dejaba pasar al cajero, que así
// podía bajarse la base entera con mails, teléfonos y fechas de nacimiento.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cafe = await getCafeBySlugIfAuthorized(slug, session, 'owner')
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const links = await prisma.customerCafe.findMany({
    where: { cafeId: cafe.id },
    include: { customer: { select: { name: true, email: true, phone: true, birthdate: true, favoriteDrink: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const csv = buildCustomerCsv(links, cafe.stampsRequired)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clientes-${slug}.csv"`,
    },
  })
}
