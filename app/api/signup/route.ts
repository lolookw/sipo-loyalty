import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/signup — alta self-service de cafeterías (público, crea un lead).
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const cafeName = String(body.cafeName ?? '').trim()
  const ownerName = String(body.ownerName ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const phone = body.phone ? String(body.phone).trim() : null
  const city = body.city ? String(body.city).trim() : null
  const instagram = body.instagram ? String(body.instagram).trim() : null
  const message = body.message ? String(body.message).trim().slice(0, 1000) : null
  const referredBy = body.referredBy ? String(body.referredBy).trim().slice(0, 120) : null

  if (!cafeName || !ownerName || !email)
    return NextResponse.json({ error: 'Completá el nombre de la cafetería, tu nombre y tu email.' }, { status: 400 })
  if (!EMAIL_REGEX.test(email))
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })

  // Anti-spam liviano: no aceptar otro pedido pendiente del mismo email en los últimos 5 minutos
  const recent = await prisma.cafeSignupRequest.findFirst({
    where: { email, status: 'pending', createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) } },
  })
  if (recent)
    return NextResponse.json({ ok: true, duplicate: true }) // idempotente para el usuario, no crea duplicado

  await prisma.cafeSignupRequest.create({
    data: { cafeName, ownerName, email, phone, city, instagram, message, referredBy },
  })

  return NextResponse.json({ ok: true })
}
