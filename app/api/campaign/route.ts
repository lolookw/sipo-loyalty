import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCafeIfAuthorized } from '@/lib/cafeAuth'
import { CAMPAIGN_TYPES } from '@/lib/campaigns'

type CampaignInput = {
  name?: string
  type?: string
  multiplier?: number | null
  bonusPoints?: number | null
  bonusStamps?: number | null
  bonusExpiryDays?: number
  startsAt?: Date
  endsAt?: Date
}

// Valida y normaliza el body. Devuelve un string de error o los campos limpios.
function parseCampaignFields(body: Record<string, unknown>, partial: boolean): CampaignInput | string {
  const out: CampaignInput = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return 'Falta el nombre'
    out.name = name.slice(0, 80)
  } else if (!partial) return 'Falta el nombre'

  if (body.type !== undefined) {
    if (!CAMPAIGN_TYPES.includes(body.type as (typeof CAMPAIGN_TYPES)[number])) return 'Tipo de campaña inválido'
    out.type = String(body.type)
  } else if (!partial) return 'Falta el tipo'

  // Nota: 'campo' in body distingue "no lo mandaron" (no tocar) de "lo mandaron en null"
  // (limpiarlo a propósito — pasa al cambiar de tipo o destildar una opción del bono de bienvenida).
  if ('multiplier' in body) {
    if (body.multiplier === null) out.multiplier = null
    else {
      const m = Number(body.multiplier)
      if (!Number.isFinite(m) || m <= 1 || m > 10) return 'El multiplicador debe ser mayor a 1 (máx. 10)'
      out.multiplier = m
    }
  }

  if ('bonusPoints' in body) {
    if (body.bonusPoints === null) out.bonusPoints = null
    else {
      const b = Number(body.bonusPoints)
      if (!Number.isFinite(b) || b <= 0 || b > 100000) return 'Los puntos de regalo deben ser mayores a 0'
      out.bonusPoints = b
    }
  }

  if ('bonusStamps' in body) {
    if (body.bonusStamps === null) out.bonusStamps = null
    else {
      const s = Math.floor(Number(body.bonusStamps))
      if (!Number.isFinite(s) || s <= 0 || s > 50) return 'Los sellos de regalo deben ser entre 1 y 50'
      out.bonusStamps = s
    }
  }

  if (body.bonusExpiryDays !== undefined) {
    const d = Math.floor(Number(body.bonusExpiryDays))
    if (!Number.isFinite(d) || d < 1 || d > 365) return 'Vigencia de los puntos de regalo inválida (1-365 días)'
    out.bonusExpiryDays = d
  }

  if (body.startsAt !== undefined) {
    const s = new Date(String(body.startsAt))
    if (isNaN(s.getTime())) return 'Fecha de inicio inválida'
    out.startsAt = s
  } else if (!partial) return 'Falta la fecha de inicio'

  if (body.endsAt !== undefined) {
    const e = new Date(String(body.endsAt))
    if (isNaN(e.getTime())) return 'Fecha de fin inválida'
    out.endsAt = e
  } else if (!partial) return 'Falta la fecha de fin'

  return out
}

function typeValueError(fields: { type?: string; multiplier?: number | null; bonusPoints?: number | null; bonusStamps?: number | null }): string | null {
  if ((fields.type === 'points_multiplier' || fields.type === 'stamp_multiplier') && !fields.multiplier)
    return 'Indicá el multiplicador (ej: 2 = doble)'
  if (fields.type === 'bonus_points' && !fields.bonusPoints)
    return 'Indicá cuántos puntos de regalo da la campaña'
  if (fields.type === 'signup_bonus' && !fields.bonusPoints && !fields.bonusStamps)
    return 'Indicá puntos y/o sellos de regalo por registrarse'
  return null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cafeId = req.nextUrl.searchParams.get('cafeId')
  if (!cafeId) return NextResponse.json({ error: 'Missing cafeId' }, { status: 400 })

  // Solo dueño/superadmin: las campañas regalan puntos y sellos, no son cosa de la caja
  // (crear/editar/borrar ya era del dueño; leer y CREAR se colaban por el chequeo de slug).
  const cafe = await getCafeIfAuthorized(cafeId, session, 'owner')
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const campaigns = await prisma.campaign.findMany({
    where: { cafeId },
    orderBy: { startsAt: 'desc' },
  })
  return NextResponse.json(campaigns)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  const cafe = await getCafeIfAuthorized(body.cafeId, session, 'owner')
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const fields = parseCampaignFields(body, false)
  if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })
  if (fields.endsAt! <= fields.startsAt!)
    return NextResponse.json({ error: 'La fecha de fin debe ser posterior a la de inicio' }, { status: 400 })
  const valueError = typeValueError(fields)
  if (valueError) return NextResponse.json({ error: valueError }, { status: 400 })

  const campaign = await prisma.campaign.create({
    data: {
      cafeId: cafe.id,
      name: fields.name!,
      type: fields.type!,
      multiplier: fields.multiplier ?? null,
      bonusPoints: fields.bonusPoints ?? null,
      bonusStamps: fields.bonusStamps ?? null,
      bonusExpiryDays: fields.bonusExpiryDays ?? 30,
      startsAt: fields.startsAt!,
      endsAt: fields.endsAt!,
      active: true,
    },
  })
  return NextResponse.json(campaign)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const isSuperAdmin = session.user.role === 'superadmin'
  const campaign = await prisma.campaign.findUnique({ where: { id: body.id }, include: { cafe: true } })
  if (!campaign || (!isSuperAdmin && campaign.cafe.ownerId !== session.user.id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const fields = parseCampaignFields(body, true)
  if (typeof fields === 'string') return NextResponse.json({ error: fields }, { status: 400 })

  const merged = { ...campaign, ...fields }
  if (merged.endsAt <= merged.startsAt)
    return NextResponse.json({ error: 'La fecha de fin debe ser posterior a la de inicio' }, { status: 400 })
  const valueError = typeValueError(merged)
  if (valueError) return NextResponse.json({ error: valueError }, { status: 400 })

  const updated = await prisma.campaign.update({
    where: { id: body.id },
    data: {
      ...fields,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const isSuperAdmin = session.user.role === 'superadmin'
  const campaign = await prisma.campaign.findUnique({ where: { id }, include: { cafe: true } })
  if (!campaign || (!isSuperAdmin && campaign.cafe.ownerId !== session.user.id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
