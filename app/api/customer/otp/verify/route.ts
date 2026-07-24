import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signCustomerToken } from '@/lib/customerToken'
import { attachReferral, ensureReferralCode } from '@/lib/referrals'

export async function POST(req: NextRequest) {
  const { email, code, cafeId, ref } = await req.json()
  if (!email || !code || !cafeId)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()
  const now = new Date()

  const otp = await prisma.customerOtp.findFirst({
    where: {
      email: normalizedEmail,
      used: false,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 401 })

  if (otp.code !== code) {
    await prisma.customerOtp.update({ where: { id: otp.id }, data: { used: true } })
    return NextResponse.json(
      { error: 'Código inválido o expirado. Pedí un nuevo código para volver a intentar.' },
      { status: 401 },
    )
  }

  await prisma.customerOtp.update({ where: { id: otp.id }, data: { used: true } })

  const customer = await prisma.customer.findUnique({
    where: { email: normalizedEmail },
    include: { cafes: { where: { cafeId } } },
  })

  const customerToken = await signCustomerToken(normalizedEmail)

  if (!customer) return NextResponse.json({ newUser: true, customerToken })

  let loyalty = customer.cafes[0] || null
  if (loyalty && !loyalty.referralCode) {
    const refCode = await ensureReferralCode(prisma, loyalty.id)
    if (refCode) loyalty = { ...loyalty, referralCode: refCode }
  }

  // Cliente existente pero nuevo en ESTE café: si vino con código de invitación, registrar el referido
  if (!loyalty && typeof ref === 'string' && ref.trim()) {
    try { await attachReferral(prisma, { cafeId, code: ref, referredCustomerId: customer.id }) }
    catch (e) { console.error('referral attach error:', e) } // nunca bloquea el login
  }

  const transactions = await prisma.transaction.findMany({
    where: { customerId: customer.id, cafeId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, type: true, stamps: true, points: true, amount: true, note: true, createdAt: true },
  })

  return NextResponse.json({ ...customer, loyalty, transactions, customerToken })
}
