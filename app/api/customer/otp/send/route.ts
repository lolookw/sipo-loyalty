import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { otpSendDecision, OTP_UNKNOWN_EMAIL_HOURLY_CAP } from '@/lib/otpLimits'

const HOUR = 60 * 60 * 1000

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function generateOtp(): string {
  // randomInt es criptográficamente seguro (a diferencia de Math.random)
  return randomInt(100000, 1000000).toString()
}

export async function POST(req: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not configured')
    return NextResponse.json({ error: 'Email service is not configured' }, { status: 500 })
  }

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(normalizedEmail))
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })

  const desde = new Date(Date.now() - HOUR)

  // Dos límites, ver lib/otpLimits.ts: uno por dirección (hostigamiento a una persona) y otro
  // sobre la dispersión de direcciones desconocidas (alguien rociando mails inventados para
  // quemar la cuota de Resend, que es compartida por toda la plataforma incluido este login).
  const [recentSends, known] = await Promise.all([
    prisma.customerOtp.count({ where: { email: normalizedEmail, createdAt: { gt: desde } } }),
    prisma.customer.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
  ])

  // Solo se paga esta consulta cuando la dirección es desconocida: a un cliente que ya existe no
  // lo frena nunca. El `take` la deja acotada — alcanza con saber si pasó el tope, no cuánto.
  let distinctEmailsLastHour: number | undefined
  if (!known) {
    const grupos = await prisma.customerOtp.groupBy({
      by: ['email'],
      where: { createdAt: { gt: desde } },
      orderBy: { email: 'asc' },
      take: OTP_UNKNOWN_EMAIL_HOURLY_CAP + 1,
    })
    distinctEmailsLastHour = grupos.length
  }

  const decision = otpSendDecision({
    isKnownCustomer: !!known,
    sendsForThisEmailLastHour: recentSends,
    distinctEmailsLastHour,
  })

  if (!decision.ok) {
    if (decision.reason === 'unknown_flood') {
      // Queda registrado para poder verlo en los logs si alguna vez salta de verdad. El mensaje al
      // usuario es genérico a propósito: no tiene por qué explicarle el mecanismo a quien lo probó.
      console.warn(
        `OTP: tope de direcciones nuevas alcanzado (${distinctEmailsLastHour} distintas en la última hora)`,
      )
      return NextResponse.json(
        { error: 'Estamos recibiendo muchas solicitudes en este momento. Probá de nuevo en unos minutos.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos antes de pedir otro código.' },
      { status: 429 },
    )
  }

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  // Invalidar OTPs anteriores (marcar como usados, no borrar — necesario para el rate limit)
  await prisma.customerOtp.updateMany({
    where: { email: normalizedEmail, used: false },
    data: { used: true },
  })

  await prisma.customerOtp.create({
    data: { email: normalizedEmail, code, expiresAt },
  })

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'Sipo <onboarding@resend.dev>',
    to: normalizedEmail,
    subject: `Tu código de verificación`,
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto; padding: 40px 24px; background: #faf7f2;">
        <h2 style="font-size: 22px; color: #1c1917; margin: 0 0 8px;">Tu código de acceso</h2>
        <p style="color: #78716c; font-size: 14px; margin: 0 0 32px; line-height: 1.6;">
          Ingresá este código en la pantalla de fidelidad. Expira en 10 minutos.
        </p>
        <div style="background: white; border: 1px solid #e8dece; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 44px; font-weight: 700; letter-spacing: 10px; color: #1c1917; font-variant-numeric: tabular-nums;">${code}</span>
        </div>
        <p style="color: #a8a29e; font-size: 12px; margin: 0;">
          Si no pediste este código, podés ignorar este email.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 })
  }

  return NextResponse.json({ sent: true })
}
