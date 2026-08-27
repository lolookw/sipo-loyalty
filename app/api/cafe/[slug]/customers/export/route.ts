import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildCustomerCsv } from '@/lib/customerExport'

// GET /api/cafe/[slug]/customers/export — descarga CSV con la tabla de clientes del café.
// Mismo umbral de acceso que la página /admin/customers (dueño/staff del café, o superadmin).
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, cafeSlug: sessionSlug } = session.user
  if (role !== 'superadmin' && sessionSlug !== slug)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cafe = await prisma.cafe.findUnique({ where: { slug }, select: { id: true, stampsRequired: true } })
  if (!cafe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
