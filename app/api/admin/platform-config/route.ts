import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const STRING_FIELDS = ['contactEmail', 'whatsappNumber', 'whatsappUrl', 'instagramUrl', 'xUrl'] as const

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cfg = await prisma.platformConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })
  return NextResponse.json(cfg)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  for (const key of STRING_FIELDS) {
    if (key in body) {
      const v = body[key]
      data[key] = typeof v === 'string' && v.trim() ? v.trim() : null
    }
  }
  if ('graceDays' in body) {
    const g = Number(body.graceDays)
    if (Number.isFinite(g) && g >= 0 && g <= 90) data.graceDays = Math.floor(g)
  }

  const cfg = await prisma.platformConfig.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  })
  return NextResponse.json(cfg)
}
