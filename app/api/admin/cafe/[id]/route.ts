import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SELLABLE_TIERS, isPlanTier, type PlanTier } from '@/lib/plans'
import { getPlanTiers } from '@/lib/planTiers'
import { cancelSubscription } from '@/lib/mercadopago'
import { addMonths, billingAnchorFrom } from '@/lib/dates'

// PATCH — acciones de plan del café (solo superadmin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  const now = new Date()

  const cafe = await prisma.cafe.findUnique({ where: { id } })
  if (!cafe) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  // Tier a asignar en activaciones pagas: default "economico" si no se especifica o es inválido.
  const tiers = await getPlanTiers()
  const requestedTier = typeof body.planTier === 'string' && isPlanTier(body.planTier) ? body.planTier : null
  const tier: PlanTier = requestedTier && SELLABLE_TIERS.includes(requestedTier) ? requestedTier : 'economico'
  // Al activar con un tier explícito se da por atendido cualquier pedido de cambio pendiente
  // del dueño (ver plan §5F) — si no, el aviso quedaría colgado en el panel para siempre.
  const tierFields = {
    planTier: tier,
    customerLimit: tiers[tier].customerLimit!,
    planChangeRequestedTier: null,
    planChangeRequestedAt: null,
  }

  let data: Record<string, unknown>
  switch (action) {
    case 'activate_month': {
      const months = Math.min(Math.max(Number(body.months) || 1, 1), 24)
      // Si ya tiene una fecha futura, extiende desde ahí (apila); si no, desde hoy
      const from = cafe.activeUntil && cafe.activeUntil > now ? new Date(cafe.activeUntil) : new Date(now)
      // El día de facturación se fija en la primera activación y se respeta de ahí en más, así
      // "+1 mes" sobre un 31 de enero da 28 de febrero y no 3 de marzo (ver lib/dates.ts).
      const anchorDay = cafe.billingAnchorDay ?? billingAnchorFrom(from)
      data = {
        planStatus: 'active', isPermanent: false,
        activeUntil: addMonths(from, months, anchorDay), billingAnchorDay: anchorDay,
        activatedAt: now, ...tierFields,
      }
      break
    }
    case 'activate_permanent':
      data = { planStatus: 'active', isPermanent: true, activeUntil: null, activatedAt: now, ...tierFields }
      break
    case 'set_trial':
      data = { planStatus: 'trial', isPermanent: false, activeUntil: null, planTier: 'free', customerLimit: tiers.free.customerLimit }
      break
    case 'expire':
      data = { planStatus: 'expired', isPermanent: false, activeUntil: null }
      break
    case 'set_active_until': {
      // Corrección manual de la fecha de vencimiento. Los botones de +1/+3 meses APILAN sobre la
      // fecha existente, así que sin esto no había forma de restar meses puestos de más.
      const raw = String(body.activeUntil ?? '')
      const parsed = new Date(raw)
      if (!raw || Number.isNaN(parsed.getTime()))
        return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
      // Se guarda al final del día elegido: si ponés el 30, el plan vale todo el 30.
      parsed.setHours(23, 59, 59, 999)
      // Fijar la fecha a mano también redefine el día de facturación: es una decisión explícita
      // sobre cuándo vence, así que los "+1 mes" siguientes tienen que respetar ESE día.
      data = {
        planStatus: 'active', isPermanent: false,
        activeUntil: parsed, billingAnchorDay: billingAnchorFrom(parsed),
      }
      break
    }
    default:
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  // Cambio de tier a mitad de ciclo sobre un café que paga por Mercado Pago (ver plan §5H).
  // El tope nuevo rige YA (arriba), pero el MONTO no se toca hasta la próxima renovación: no se
  // cobra ni se acredita diferencia por lo que queda del mes ya pagado. Se agenda el sync para
  // `activeUntil` (o para ya, si el plan quedó sin vencimiento) y el cron hace el PUT ahí.
  // Ojo: se agenda solo si el monto REALMENTE cambia, para no disparar un PUT al pedo.
  if ((action === 'activate_month' || action === 'activate_permanent') && cafe.mpPreapprovalId) {
    const newPrice = tiers[tier].price
    if (newPrice !== null && cafe.mpSubscriptionAmount !== newPrice) {
      Object.assign(data, { pendingBillingSyncAt: (data.activeUntil as Date | null) ?? now })
    }
  }

  // ⚠️ Bajar a gratis o vencer un café NO puede dejar viva la suscripción de Mercado Pago: si no,
  // el café queda sin servicio pago pero le siguen cobrando todos los meses. Se cancela primero.
  if ((action === 'set_trial' || action === 'expire') && cafe.mpPreapprovalId) {
    await cancelSubscription(cafe.mpPreapprovalId)
    Object.assign(data, {
      mpPreapprovalStatus: 'cancelled',
      pendingSubscriptionTier: null,
      pendingSubscriptionAt: null,
      planChangeRequestedTier: null,
      planChangeRequestedAt: null,
      pendingBillingSyncAt: null, // no sincronizar el monto de algo ya cancelado
      mpFirstFailureAt: null,
    })
  }

  const updated = await prisma.cafe.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const cafe = await prisma.cafe.findUnique({ where: { id } })
    if (!cafe) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    // ⚠️ Cancelar la suscripción de MP ANTES de borrar el café: si no, MP sigue cobrando todos los
    // meses una suscripción cuyo café ya no existe, y sin el id guardado no hay forma de rastrearla
    // desde el panel. Se cancela primero y solo se sigue si MP confirmó (o si no había suscripción).
    if (cafe.mpPreapprovalId) {
      const cancelled = await cancelSubscription(cafe.mpPreapprovalId)
      if (!cancelled.ok) {
        return NextResponse.json(
          { error: `No se borró el café para no dejar un cobro activo sin dueño: Mercado Pago no aceptó cancelar la suscripción (${cancelled.reason}).` },
          { status: 502 },
        )
      }
    }

    // Todo el borrado va en UNA transacción: son diez deletes encadenados y, sueltos, un error a
    // mitad de camino (una FK nueva, un timeout) dejaba el café existiendo pero ya sin clientes ni
    // historial — y eso no se puede deshacer. Así o se borra entero o no se toca nada.
    //
    // Ojo con el orden: manda las dependencias. Faltaban campaign/referral/apiKey/broadcast —
    // sin ellos, borrar un café que tuviera cualquiera de esos rompía por FK.
    await prisma.$transaction(async tx => {
      // Cafeterías que este café recomendó: se sueltan primero, porque apuntan a esta fila.
      await tx.cafe.updateMany({ where: { referredByCafeId: id }, data: { referredByCafeId: null } })

      await tx.broadcastRecipient.deleteMany({ where: { broadcast: { cafeId: id } } })
      await tx.broadcast.deleteMany({ where: { cafeId: id } })
      await tx.transaction.deleteMany({ where: { cafeId: id } })
      await tx.referral.deleteMany({ where: { cafeId: id } })
      await tx.campaign.deleteMany({ where: { cafeId: id } })
      await tx.apiKey.deleteMany({ where: { cafeId: id } })
      await tx.customerCafe.deleteMany({ where: { cafeId: id } })
      await tx.reward.deleteMany({ where: { cafeId: id } })
      await tx.cafeStaff.deleteMany({ where: { cafeId: id } })
      await tx.cafe.delete({ where: { id } })

      // Si el owner ya no tiene cafés, lo eliminamos también
      const remaining = await tx.cafe.count({ where: { ownerId: cafe.ownerId } })
      if (remaining === 0) {
        await tx.owner.delete({ where: { id: cafe.ownerId } })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
