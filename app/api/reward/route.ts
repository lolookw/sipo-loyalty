import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCafeIfAuthorized } from '@/lib/cafeAuth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cafeId = req.nextUrl.searchParams.get('cafeId')
  if (!cafeId) return NextResponse.json({ error: 'Missing cafeId' }, { status: 400 })

  // Validate session has access to this café
  const cafe = await getCafeIfAuthorized(cafeId, session)
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rewards = await prisma.reward.findMany({
    where: { cafeId },
    orderBy: { pointsCost: 'asc' },
  })
  return NextResponse.json(rewards)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  const cafe = await getCafeIfAuthorized(body.cafeId, session)
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Whitelist fields — never pass raw body to Prisma
  const reward = await prisma.reward.create({
    data: {
      cafeId: cafe.id,
      name: String(body.name ?? '').trim(),
      description: body.description ? String(body.description).trim() : null,
      pointsCost: Math.max(0, Number(body.pointsCost) || 0),
      emoji: body.emoji ? String(body.emoji) : '🎁',
    },
  })
  return NextResponse.json(reward)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const isSuperAdmin = session.user.role === 'superadmin'
  const reward = await prisma.reward.findUnique({ where: { id: body.id }, include: { cafe: true } })
  if (!reward || (!isSuperAdmin && reward.cafe.ownerId !== session.user.id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Whitelist fields
  const updated = await prisma.reward.update({
    where: { id: body.id },
    data: {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
      pointsCost: body.pointsCost !== undefined ? Math.max(0, Number(body.pointsCost) || 0) : undefined,
      emoji: body.emoji !== undefined ? String(body.emoji) : undefined,
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
  const reward = await prisma.reward.findUnique({ where: { id }, include: { cafe: true } })
  if (!reward || (!isSuperAdmin && reward.cafe.ownerId !== session.user.id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.reward.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
