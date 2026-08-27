import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/unsubscribe/[id] — público, sin auth (a propósito: es un link de un email, el "id" es
// el CustomerCafe.id, un cuid impredecible — mismo modelo de seguridad que referralCode). Efecto
// acotado: solo apaga difusión de marketing para ESE café, nunca toca emails transaccionales
// (OTP, vencimiento de sellos, reactivación).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const link = await prisma.customerCafe.findUnique({ where: { id }, select: { id: true } })
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.customerCafe.update({ where: { id }, data: { marketingOptOut: true } })
  return NextResponse.json({ ok: true })
}
