import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signCustomerToken, verifyCustomerToken, extractBearerToken } from '@/lib/customerToken'
import { cafeCanAcceptCustomer } from '@/lib/plan'
import { attachReferral, ensureReferralCode } from '@/lib/referrals'

// GET /api/customer/public?email=xxx&cafeId=xxx  — requires customer JWT
export async function GET(req: NextRequest) {
  const tokenEmail = await verifyCustomerToken(extractBearerToken(req.headers.get('authorization')) ?? '')
  if (!tokenEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = req.nextUrl.searchParams.get('email')
  const cafeId = req.nextUrl.searchParams.get('cafeId')
  if (!email || !cafeId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Token must match the requested email
  if (tokenEmail !== email.trim().toLowerCase())
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const customer = await prisma.customer.findUnique({
    where: { email: tokenEmail },
    include: { cafes: { where: { cafeId } } },
  })
  if (!customer) return NextResponse.json(null)

  const transactions = await prisma.transaction.findMany({
    where: { customerId: customer.id, cafeId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, type: true, stamps: true, points: true, amount: true, note: true, createdAt: true },
  })

  let loyalty = customer.cafes[0] || null
  if (loyalty && !loyalty.referralCode) {
    const refCode = await ensureReferralCode(prisma, loyalty.id)
    if (refCode) loyalty = { ...loyalty, referralCode: refCode }
  }

  return NextResponse.json({ ...customer, loyalty, transactions })
}

// PATCH /api/customer/public — update customer profile, requires customer JWT
export async function PATCH(req: NextRequest) {
  const tokenEmail = await verifyCustomerToken(extractBearerToken(req.headers.get('authorization')) ?? '')
  if (!tokenEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, phone, birthdate, favoriteDrink } = await req.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()
  if (tokenEmail !== normalizedEmail) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.customer.findUnique({ where: { email: normalizedEmail }, select: { birthdate: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const customer = await prisma.customer.update({
    where: { email: normalizedEmail },
    data: {
      phone: phone?.trim() || null,
      favoriteDrink: favoriteDrink?.trim() || null,
      ...(existing.birthdate == null && birthdate ? { birthdate: new Date(birthdate) } : {}),
    },
  })
  return NextResponse.json(customer)
}

// POST /api/customer/public — register customer after OTP verification
export async function POST(req: NextRequest) {
  const tokenEmail = await verifyCustomerToken(extractBearerToken(req.headers.get('authorization')) ?? '')
  if (!tokenEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, name, cafeId, ref } = await req.json()
  if (!email || !name || !cafeId)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()
  if (tokenEmail !== normalizedEmail) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } })
  if (!cafe) return NextResponse.json({ error: 'Cafe not found' }, { status: 404 })

  // Límite del plan gratuito: bloquear clientes nuevos si el café llegó al tope (los ya vinculados pasan)
  if (!(await cafeCanAcceptCustomer(cafe, normalizedEmail)))
    return NextResponse.json(
      { error: 'Esta cafetería alcanzó el máximo de su plan por ahora. Volvé a intentar más tarde.', planLimitReached: true },
      { status: 403 },
    )

  const customer = await prisma.customer.upsert({
    where: { email: normalizedEmail },
    update: { name },
    create: { email: normalizedEmail, name },
  })

  const preExisting = await prisma.customerCafe.findUnique({
    where: { customerId_cafeId: { customerId: customer.id, cafeId } },
    select: { id: true },
  })

  let link = await prisma.customerCafe.upsert({
    where: { customerId_cafeId: { customerId: customer.id, cafeId } },
    update: {},
    create: { customerId: customer.id, cafeId },
  })

  if (!link.referralCode) {
    const refCode = await ensureReferralCode(prisma, link.id)
    if (refCode) link = { ...link, referralCode: refCode }
  }

  // Vino con código de invitación y es realmente nuevo en el café → referido pendiente
  if (!preExisting && typeof ref === 'string' && ref.trim()) {
    try { await attachReferral(prisma, { cafeId, code: ref, referredCustomerId: customer.id }) }
    catch (e) { console.error('referral attach error:', e) } // nunca bloquea el alta
  }

  const customerToken = await signCustomerToken(normalizedEmail)
  return NextResponse.json({ ...customer, loyalty: link, transactions: [], customerToken })
}
