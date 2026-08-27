import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCafeIfAuthorized } from '@/lib/cafeAuth'
import { cafeCanAcceptCustomer } from '@/lib/plan'
import { searchCafeCustomers } from '@/lib/customerSearch'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email  = req.nextUrl.searchParams.get('email')
  const search = req.nextUrl.searchParams.get('search')
  const cafeId = req.nextUrl.searchParams.get('cafeId')
  if (!cafeId) return NextResponse.json({ error: 'Missing cafeId' }, { status: 400 })

  const cafe = await getCafeIfAuthorized(cafeId, session)
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── Autocomplete: ?search=xxx&cafeId=xxx ──────────────────────────────────
  if (search) {
    const customers = await searchCafeCustomers(prisma, cafeId, search)
    return NextResponse.json(
      customers.map(c => ({ ...c, loyalty: c.cafes[0] || null }))
    )
  }

  // ── Exact lookup: ?email=xxx&cafeId=xxx ───────────────────────────────────
  if (!email) return NextResponse.json({ error: 'Missing email or search' }, { status: 400 })

  const customer = await prisma.customer.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { cafes: { where: { cafeId } } },
  })

  if (!customer) return NextResponse.json(null)

  return NextResponse.json({ ...customer, loyalty: customer.cafes[0] || null })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, name, cafeId } = await req.json()
  if (!email || !name || !cafeId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const cafe = await getCafeIfAuthorized(cafeId, session)
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const normalizedEmail = email.trim().toLowerCase()

  // Límite del plan gratuito: no permitir sumar un cliente nuevo si el café llegó al tope
  if (!(await cafeCanAcceptCustomer(cafe, normalizedEmail)))
    return NextResponse.json(
      { error: 'Llegaste al máximo de clientes del plan gratuito. Activá tu cuenta para sumar más.', planLimitReached: true },
      { status: 403 },
    )

  const customer = await prisma.customer.upsert({
    where: { email: normalizedEmail },
    update: { name },
    create: { email: normalizedEmail, name },
  })

  const link = await prisma.customerCafe.upsert({
    where: { customerId_cafeId: { customerId: customer.id, cafeId } },
    update: {},
    create: { customerId: customer.id, cafeId },
  })

  return NextResponse.json({ ...customer, loyalty: link })
}
