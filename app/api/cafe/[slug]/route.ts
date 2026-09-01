import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sanitizeCustomLinks, sanitizePublicUrl } from '@/lib/utils'
import { PUBLIC_CAFE_SELECT } from '@/lib/publicCafe'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Endpoint sin sesión: se enumeran los campos publicables en vez de sacar los internos de a uno
  // (antes salía el registro entero menos ownerId, incluidos el email de Mercado Pago del dueño,
  // el id y el monto de su suscripción y el estado del plan). Ver lib/publicCafe.ts.
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: PUBLIC_CAFE_SELECT,
  })
  if (!cafe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(cafe)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cafe = await prisma.cafe.findUnique({ where: { slug } })
  const isSuperAdmin = session.user.role === 'superadmin'
  if (!cafe || (!isSuperAdmin && cafe.ownerId !== session.user.id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  let linkFields: {
    logoUrl?: string | null
    coverUrl?: string | null
    menuUrl?: string | null
    mapsUrl?: string | null
    instagramUrl?: string | null
    whatsappUrl?: string | null
    websiteUrl?: string | null
    customLinks?: string | null
    reviewUrl?: string | null
  }
  try {
    linkFields = {
      logoUrl: sanitizePublicUrl(body.logoUrl),
      coverUrl: sanitizePublicUrl(body.coverUrl),
      menuUrl: sanitizePublicUrl(body.menuUrl),
      mapsUrl: sanitizePublicUrl(body.mapsUrl),
      instagramUrl: sanitizePublicUrl(body.instagramUrl),
      whatsappUrl: sanitizePublicUrl(body.whatsappUrl),
      websiteUrl: sanitizePublicUrl(body.websiteUrl),
      customLinks: sanitizeCustomLinks(body.customLinks),
      reviewUrl: sanitizePublicUrl(body.reviewUrl),
    }
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  const minPurchaseForStamp =
    body.minPurchaseForStamp === undefined ? undefined : Number(body.minPurchaseForStamp)
  if (
    minPurchaseForStamp !== undefined &&
    (!Number.isFinite(minPurchaseForStamp) || minPurchaseForStamp < 0)
  ) {
    return NextResponse.json({ error: 'Monto mínimo inválido' }, { status: 400 })
  }

  // Sellos necesarios: tiene que ser un entero >= 1. En 0 la tarjeta queda rota — "canjear"
  // pasaba siempre el chequeo de `stamps >= stampsRequired` y sumar sellos fallaba siempre.
  const stampsRequired =
    body.stampsRequired === undefined ? undefined : Math.floor(Number(body.stampsRequired))
  if (
    stampsRequired !== undefined &&
    (!Number.isFinite(stampsRequired) || stampsRequired < 1 || stampsRequired > 100)
  ) {
    return NextResponse.json({ error: 'Los sellos para el premio tienen que ser entre 1 y 100' }, { status: 400 })
  }

  // Puntos por unidad de moneda: no puede ser negativo (restaría puntos en cada compra).
  const pointsPerPeso =
    body.pointsPerPeso === undefined ? undefined : Number(body.pointsPerPeso)
  if (
    pointsPerPeso !== undefined &&
    (!Number.isFinite(pointsPerPeso) || pointsPerPeso < 0 || pointsPerPeso > 10000)
  ) {
    return NextResponse.json({ error: 'Puntos por unidad inválidos' }, { status: 400 })
  }

  // Textos que después se muestran en pantallas públicas y en emails: con tope de largo y sin
  // dejar el nombre vacío (el nombre es el título de la página del café).
  const name = body.name === undefined ? undefined : String(body.name).trim().slice(0, 80)
  if (name !== undefined && !name)
    return NextResponse.json({ error: 'El nombre de la cafetería no puede quedar vacío' }, { status: 400 })
  const description =
    body.description === undefined ? undefined : (String(body.description).trim().slice(0, 300) || null)
  const stampReward =
    body.stampReward === undefined ? undefined : (String(body.stampReward).trim().slice(0, 120) || undefined)
  const currencySymbol =
    body.currencySymbol === undefined ? undefined : (String(body.currencySymbol).trim().slice(0, 5) || undefined)

  // Colores: van a parar a estilos inline y a los emails, así que solo hex.
  const HEX = /^#[0-9a-fA-F]{6}$/
  for (const key of ['primaryColor', 'accentColor'] as const) {
    if (body[key] !== undefined && !HEX.test(String(body[key])))
      return NextResponse.json({ error: 'Color inválido' }, { status: 400 })
  }

  const stampExpiryDays =
    body.stampExpiryDays === undefined ? undefined : Math.floor(Number(body.stampExpiryDays))
  if (
    stampExpiryDays !== undefined &&
    (!Number.isFinite(stampExpiryDays) || stampExpiryDays < 0 || stampExpiryDays > 365)
  ) {
    return NextResponse.json({ error: 'Vencimiento de sellos inválido' }, { status: 400 })
  }

  const referralRewardAmount =
    body.referralRewardAmount === undefined ? undefined : Number(body.referralRewardAmount)
  if (
    referralRewardAmount !== undefined &&
    (!Number.isFinite(referralRewardAmount) || referralRewardAmount <= 0 || referralRewardAmount > 100000)
  ) {
    return NextResponse.json({ error: 'Premio por referido inválido' }, { status: 400 })
  }

  const referralRewardType =
    body.referralRewardType === undefined ? undefined : String(body.referralRewardType)
  if (referralRewardType !== undefined && !['points', 'stamps'].includes(referralRewardType)) {
    return NextResponse.json({ error: 'Tipo de premio por referido inválido' }, { status: 400 })
  }

  const reengagementInactiveDays =
    body.reengagementInactiveDays === undefined ? undefined : Math.floor(Number(body.reengagementInactiveDays))
  if (
    reengagementInactiveDays !== undefined &&
    (!Number.isFinite(reengagementInactiveDays) || reengagementInactiveDays < 1 || reengagementInactiveDays > 365)
  ) {
    return NextResponse.json({ error: 'Días de inactividad inválidos' }, { status: 400 })
  }

  const reengagementCompletedDays =
    body.reengagementCompletedDays === undefined ? undefined : Math.floor(Number(body.reengagementCompletedDays))
  if (
    reengagementCompletedDays !== undefined &&
    (!Number.isFinite(reengagementCompletedDays) || reengagementCompletedDays < 1 || reengagementCompletedDays > 365)
  ) {
    return NextResponse.json({ error: 'Días de tarjeta completa inválidos' }, { status: 400 })
  }

  const reengagementInactiveMessage =
    body.reengagementInactiveMessage === undefined ? undefined : String(body.reengagementInactiveMessage).trim().slice(0, 600) || null
  const reengagementCompletedMessage =
    body.reengagementCompletedMessage === undefined ? undefined : String(body.reengagementCompletedMessage).trim().slice(0, 600) || null

  const updated = await prisma.cafe.update({
    where: { slug },
    data: {
      name,
      description,
      logoUrl: linkFields.logoUrl,
      coverUrl: linkFields.coverUrl,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      fontFamily: body.fontFamily,
      menuUrl: linkFields.menuUrl,
      mapsUrl: linkFields.mapsUrl,
      instagramUrl: linkFields.instagramUrl,
      whatsappUrl: linkFields.whatsappUrl,
      websiteUrl: linkFields.websiteUrl,
      customLinks: linkFields.customLinks,
      reviewUrl: linkFields.reviewUrl,
      loyaltyEnabled: body.loyaltyEnabled !== undefined ? Boolean(body.loyaltyEnabled) : undefined,
      stampEnabled: body.stampEnabled !== undefined ? Boolean(body.stampEnabled) : undefined,
      stampsRequired,
      stampReward,
      pointsEnabled: body.pointsEnabled !== undefined ? Boolean(body.pointsEnabled) : undefined,
      pointsPerPeso,
      currencySymbol,
      minPurchaseForStamp,
      stampExpiryDays,
      referralEnabled: body.referralEnabled !== undefined ? Boolean(body.referralEnabled) : undefined,
      referralRewardType,
      referralRewardAmount,
      reengagementInactiveEnabled: body.reengagementInactiveEnabled !== undefined ? Boolean(body.reengagementInactiveEnabled) : undefined,
      reengagementInactiveDays,
      reengagementInactiveMessage,
      reengagementCompletedEnabled: body.reengagementCompletedEnabled !== undefined ? Boolean(body.reengagementCompletedEnabled) : undefined,
      reengagementCompletedDays,
      reengagementCompletedMessage,
    },
  })
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/loyalty`)
  revalidatePath('/')
  return NextResponse.json(updated)
}
