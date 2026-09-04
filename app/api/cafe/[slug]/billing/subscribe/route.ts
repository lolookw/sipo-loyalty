import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SELLABLE_TIERS, isPlanTier } from '@/lib/plans'
import { getPlanTiers } from '@/lib/planTiers'
import { createSubscriptionPreapproval, getPreapproval, cancelSubscription } from '@/lib/mercadopago'

// Alta de suscripción paga (solo gratis→pago). Cambiar entre dos tiers ya pagos pasa por el
// superadmin vía "Solicitar cambio de plan" (ver sipo-plan/04-mercado-pago/plan.md §5F).
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role === 'cashier')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cafe = await prisma.cafe.findUnique({ where: { slug }, include: { owner: { select: { email: true } } } })
  if (!cafe) return NextResponse.json({ error: 'Cafetería no encontrada' }, { status: 404 })
  if (session.user.role !== 'superadmin' && cafe.ownerId !== session.user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const tier = String(body.tier ?? '')
  if (!isPlanTier(tier) || !SELLABLE_TIERS.includes(tier))
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  // Dos casos válidos: pasar de gratis a pago, o un café que YA está en un tier pago (activado a
  // mano antes de que existiera Mercado Pago) que quiere dejar su medio de pago
  // para que se le cobre solo de acá en más. Lo que sigue sin poder hacerse acá es SALTAR de un
  // tier pago a otro: eso pasa por "Solicitar cambio de plan" (ver plan §5F).
  const yaEnEsteTier = cafe.planTier === tier
  if (cafe.planTier !== 'free' && !yaEnEsteTier)
    return NextResponse.json({ error: 'Para cambiar de plan usá "Solicitar cambio de plan".' }, { status: 400 })

  if (!process.env.MP_ACCESS_TOKEN)
    return NextResponse.json({ error: 'Mercado Pago no está configurado todavía' }, { status: 503 })

  // ⚠️ GUARDA ANTI DOBLE COBRO: si ya existe un preapproval para este café, NO crear otro sin
  // resolver el viejo primero. Sin esto, dos clicks en "Mejorar plan" dejan DOS suscripciones
  // vivas en MP cobrando en paralelo — y como en la DB solo guardamos el último id, la primera
  // quedaría cobrando para siempre sin forma de rastrearla desde el panel.
  if (cafe.mpPreapprovalId) {
    const existing = await getPreapproval(cafe.mpPreapprovalId)
    if (existing?.status === 'authorized')
      return NextResponse.json({ error: 'Este café ya tiene una suscripción activa en Mercado Pago.' }, { status: 409 })
    // "pending" = el dueño arrancó el alta y no la terminó de autorizar. Se cancela antes de
    // crear la nueva, para no dejar una suscripción huérfana que podría autorizarse después.
    if (existing?.status === 'pending') await cancelSubscription(cafe.mpPreapprovalId)
  }

  // MP exige payer_email y valida que quien autoriza entre con ESA cuenta. El mail con el que el
  // dueño entra a Sipo no tiene por qué ser el de su cuenta de Mercado Pago, así que se lo
  // preguntamos y se guarda para la próxima. Si no manda nada, cae al de login.
  const rawPayerEmail = typeof body.payerEmail === 'string' ? body.payerEmail.trim().toLowerCase() : ''
  const payerEmail = rawPayerEmail || cafe.mpPayerEmail || cafe.owner.email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail))
    return NextResponse.json({ error: 'El email de Mercado Pago no parece válido.' }, { status: 400 })

  const tiers = await getPlanTiers()
  const price = tiers[tier].price
  if (!price) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  // Ojo: NEXTAUTH_URL tiene que ser la URL canónica pública (con www). Arma tanto el back_url de
  // Mercado Pago como TODOS los links de los emails — si apunta al dominio de Vercel, los clientes
  // reciben links a vercel.app. El fallback lleva www a propósito: sipo.ar hace 307 y hay clientes
  // (webhooks, algunos mails) que no siguen redirects.
  // Si el café ya tiene un período pagado corriendo (activado a mano), el primer cobro se agenda
  // para cuando ese período termina — si no, le estaríamos cobrando un mes que ya tiene pago.
  const startDate = cafe.activeUntil && cafe.activeUntil.getTime() > Date.now() ? cafe.activeUntil : undefined

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://www.sipo.ar'
  const result = await createSubscriptionPreapproval({
    cafeId: cafe.id,
    cafeName: cafe.name,
    tierLabel: tiers[tier].label,
    amount: price,
    payerEmail,
    startDate,
    backUrl: `${baseUrl}/${cafe.slug}/admin/facturacion?billing=pending`,
  })
  if (!result) return NextResponse.json({ error: 'No pudimos iniciar la suscripción. Intentá de nuevo.' }, { status: 502 })

  await prisma.cafe.update({
    where: { id: cafe.id },
    data: {
      mpPreapprovalId: result.preapprovalId,
      mpPreapprovalStatus: result.status,
      pendingSubscriptionTier: yaEnEsteTier ? null : tier,
      pendingSubscriptionAt: yaEnEsteTier ? null : new Date(),
      mpPayerEmail: payerEmail, // se recuerda para la próxima vez
      // Lo que MP va a cobrar a partir de ahora — base de comparación para detectar cambios de
      // precio del tier más adelante (ver lib/mpBilling.ts).
      mpSubscriptionAmount: price,
      pendingBillingSyncAt: null,
      // Alta nueva: se re-arman los avisos por si este café ya había tenido un plan antes.
      mpWelcomeSentAt: null,
      planExpiredNoticeSentAt: null,
    },
  })

  return NextResponse.json({ initPoint: result.initPoint })
}
