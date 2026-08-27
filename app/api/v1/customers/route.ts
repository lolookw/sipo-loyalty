import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiCafe, apiError, normalizeEmail, apiBalance } from '@/lib/apiV1'
import { cafeCanAcceptCustomer } from '@/lib/plan'
import { grantSignupBonus } from '@/lib/signup'

// GET /api/v1/customers?email=xxx — cliente y balance en el café de la key
export async function GET(req: NextRequest) {
  const auth = await requireApiCafe(req)
  if (auth instanceof NextResponse) return auth
  const { cafe } = auth

  const email = normalizeEmail(req.nextUrl.searchParams.get('email'))
  if (!email) return apiError(400, 'invalid_email', 'Falta el parámetro email (o es inválido).')

  const customer = await prisma.customer.findUnique({
    where: { email },
    include: { cafes: { where: { cafeId: cafe.id } } },
  })
  const link = customer?.cafes[0]
  if (!customer || !link)
    return apiError(404, 'customer_not_found', 'Ese email no es cliente de este café todavía.')

  // ?include=transactions → últimas 10 del cliente en este café
  let transactions
  if (req.nextUrl.searchParams.get('include') === 'transactions') {
    const rows = await prisma.transaction.findMany({
      where: { customerId: customer.id, cafeId: cafe.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, type: true, amount: true, stamps: true, points: true, note: true, createdAt: true },
    })
    transactions = rows.map(t => ({
      id: t.id, type: t.type, amount: t.amount, stamps: t.stamps, points: t.points, note: t.note, created_at: t.createdAt,
    }))
  }

  return NextResponse.json({
    customer: { email: customer.email, name: customer.name },
    loyalty: apiBalance(link, cafe),
    ...(transactions ? { transactions } : {}),
  })
}

// POST /api/v1/customers — alta { email, name }
export async function POST(req: NextRequest) {
  const auth = await requireApiCafe(req)
  if (auth instanceof NextResponse) return auth
  const { cafe } = auth

  const body = await req.json().catch(() => null)
  if (!body) return apiError(400, 'invalid_body', 'Body JSON inválido.')

  const email = normalizeEmail(body.email)
  if (!email) return apiError(400, 'invalid_email', 'Falta email (o es inválido).')
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : null

  if (!(await cafeCanAcceptCustomer(cafe, email)))
    return apiError(403, 'plan_limit_reached', 'El café alcanzó el máximo de clientes de su plan.')

  const customer = await prisma.customer.upsert({
    where: { email },
    update: name ? { name } : {},
    create: { email, name: name ?? email.split('@')[0] },
  })

  const preExisting = await prisma.customerCafe.findUnique({
    where: { customerId_cafeId: { customerId: customer.id, cafeId: cafe.id } },
    select: { id: true },
  })

  let link = await prisma.customerCafe.upsert({
    where: { customerId_cafeId: { customerId: customer.id, cafeId: cafe.id } },
    update: {},
    create: { customerId: customer.id, cafeId: cafe.id },
  })

  if (!preExisting) {
    try {
      const grant = await grantSignupBonus(prisma, cafe, { id: link.id, customerId: customer.id })
      if (grant) link = await prisma.customerCafe.findUniqueOrThrow({ where: { id: link.id } })
    } catch (e) { console.error('signup bonus error:', e) } // nunca bloquea el alta
  }

  return NextResponse.json({
    customer: { email: customer.email, name: customer.name },
    loyalty: apiBalance(link, cafe),
  })
}
