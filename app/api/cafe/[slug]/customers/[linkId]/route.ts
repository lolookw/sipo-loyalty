import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCustomerAdjust, reengagementFieldsForAdjust } from '@/lib/customerAdmin'

// Acciones del dueño sobre un cliente de SU café (linkId = CustomerCafe.id).
// PATCH: ajustar sellos/puntos a mano.  DELETE: desvincular al cliente del café.
// Los cajeros NO pueden: son acciones destructivas/sensibles, solo dueño o superadmin.

type Ctx = { params: Promise<{ slug: string; linkId: string }> }

/** Valida sesión + que el link pertenezca REALMENTE a ese café (aislamiento por tenant). */
async function requireOwnedLink(slug: string, linkId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role === 'cashier') return { error: 'No autorizado', status: 401 as const }

  const link = await prisma.customerCafe.findUnique({
    where: { id: linkId },
    select: {
      id: true, customerId: true, cafeId: true, stamps: true,
      cafe: { select: { id: true, slug: true, ownerId: true, stampsRequired: true } },
    },
  })
  if (!link || link.cafe.slug !== slug) return { error: 'Cliente no encontrado', status: 404 as const }
  if (session.user.role !== 'superadmin' && link.cafe.ownerId !== session.user.id)
    return { error: 'No autorizado', status: 403 as const }

  return { link }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { slug, linkId } = await params
  const auth = await requireOwnedLink(slug, linkId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { link } = auth

  const body = await req.json().catch(() => ({}))
  const adjust = normalizeCustomerAdjust(body, link.cafe.stampsRequired)
  if (!adjust) return NextResponse.json({ error: 'Valores inválidos' }, { status: 400 })

  const data: Record<string, unknown> = { ...adjust }
  if (adjust.stamps !== undefined) {
    Object.assign(data, reengagementFieldsForAdjust(adjust.stamps, link.cafe.stampsRequired, new Date()))
    // Si el ajuste deja la tarjeta en 0, no tiene sentido mantener una cuenta regresiva de
    // vencimiento de sellos corriendo (ver lib/purchase.ts, mismo criterio que al canjear).
    if (adjust.stamps === 0) Object.assign(data, { stampsExpireAt: null, stampsExpiryWarned: false })
  }

  const updated = await prisma.customerCafe.update({
    where: { id: link.id },
    data,
    select: { id: true, stamps: true, points: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { slug, linkId } = await params
  const auth = await requireOwnedLink(slug, linkId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { link } = auth

  // Se borra la relación cliente↔café y TODO lo que cuelga de ella en este café: sellos, puntos,
  // historial de compras y referidos. Para la cafetería es irreversible — si esa persona vuelve,
  // arranca de cero.
  //
  // El registro de la persona (nombre, email) NO se borra: existe a nivel plataforma, no del café.
  // Al registrarse se le avisa que Sipo puede contactarla (ver /privacidad), así que esa relación
  // no depende de que un comercio puntual la mantenga en su programa. Si la propia persona pide
  // que la eliminemos, se hace a mano — la política de privacidad dice cómo pedirlo.
  await prisma.$transaction(async tx => {
    await tx.transaction.deleteMany({ where: { cafeId: link.cafeId, customerId: link.customerId } })
    await tx.referral.deleteMany({
      where: { cafeId: link.cafeId, OR: [{ referrerCustomerId: link.customerId }, { referredCustomerId: link.customerId }] },
    })
    await tx.broadcastRecipient.deleteMany({
      where: { customerId: link.customerId, broadcast: { cafeId: link.cafeId } },
    })
    await tx.customerCafe.delete({ where: { id: link.id } })
  })

  return NextResponse.json({ ok: true })
}
