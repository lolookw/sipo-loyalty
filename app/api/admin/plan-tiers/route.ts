import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EDITABLE_TIERS, isPlanTier, type PlanTier } from '@/lib/plans'
import { getPlanTiers } from '@/lib/planTiers'

// Precio y tope de clientes por tier (solo superadmin). Cambiar un PRECIO acá no cobra nada al
// instante: el cron detecta la diferencia, le avisa a cada café con 30 días de anticipación y
// recién ahí sincroniza el monto en Mercado Pago (ver lib/mpBilling.ts).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json(await getPlanTiers())
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const tier = String(body.tier ?? '')
  if (!isPlanTier(tier) || !EDITABLE_TIERS.includes(tier))
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  const customerLimit = Number(body.customerLimit)
  const price = Number(body.price)
  if (!Number.isFinite(customerLimit) || customerLimit < 1 || customerLimit > 100000)
    return NextResponse.json({ error: 'El tope de clientes tiene que estar entre 1 y 100000' }, { status: 400 })
  if (!Number.isFinite(price) || price < 0 || price > 10000000)
    return NextResponse.json({ error: 'El precio tiene que estar entre 0 y 10.000.000' }, { status: 400 })
  // El plan gratis tiene que seguir siendo gratis: si no, un café "free" pasaría a tener un precio
  // que nadie autorizó en MP y el cron intentaría cobrarlo.
  if (tier === 'free' && price !== 0)
    return NextResponse.json({ error: 'El plan gratuito no puede tener precio.' }, { status: 400 })

  const data = { customerLimit: Math.floor(customerLimit), price: Math.floor(price) }
  await prisma.planTierConfig.upsert({
    where: { tier },
    update: data,
    create: { tier, ...data },
  })

  // Los cafés que HOY están en este tier tienen que quedar con el tope nuevo. El precio NO se
  // toca acá a propósito (lo maneja el cron con aviso previo); esto es solo el límite de clientes.
  await prisma.cafe.updateMany({
    where: { planTier: tier as PlanTier },
    data: { customerLimit: data.customerLimit },
  })

  return NextResponse.json(await getPlanTiers())
}
