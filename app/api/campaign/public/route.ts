import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/campaign/public?cafeId=xxx — campañas vivas de un café, para el banner
// de la loyalty page (que es ISR y no puede hornear esto). Info pública de marketing.
export async function GET(req: NextRequest) {
  const cafeId = req.nextUrl.searchParams.get('cafeId')
  if (!cafeId) return NextResponse.json({ error: 'Missing cafeId' }, { status: 400 })

  const now = new Date()
  const campaigns = await prisma.campaign.findMany({
    where: { cafeId, active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    select: { id: true, name: true, type: true, multiplier: true, bonusPoints: true, bonusStamps: true, endsAt: true },
    orderBy: { endsAt: 'asc' },
    take: 5,
  })
  return NextResponse.json(campaigns)
}
