import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sanitizeCustomLinks, sanitizePublicUrl } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    include: { rewards: { where: { active: true }, orderBy: { pointsCost: 'asc' } } },
  })
  if (!cafe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Strip internal fields before returning publicly
  const { ownerId, ...publicCafe } = cafe
  return NextResponse.json(publicCafe)
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

  const updated = await prisma.cafe.update({
    where: { slug },
    data: {
      name: body.name,
      description: body.description,
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
      loyaltyEnabled: body.loyaltyEnabled,
      stampEnabled: body.stampEnabled,
      stampsRequired: body.stampsRequired,
      stampReward: body.stampReward,
      pointsEnabled: body.pointsEnabled,
      pointsPerPeso: body.pointsPerPeso,
      currencySymbol: body.currencySymbol,
      minPurchaseForStamp,
    },
  })
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/loyalty`)
  revalidatePath('/')
  return NextResponse.json(updated)
}
