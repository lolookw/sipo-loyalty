import { NextRequest, NextResponse } from 'next/server'
import { requireApiCafe } from '@/lib/apiV1'
import { prisma } from '@/lib/prisma'

// GET /api/v1/me — configuración del café dueño de la key
export async function GET(req: NextRequest) {
  const auth = await requireApiCafe(req)
  if (auth instanceof NextResponse) return auth
  const { cafe } = auth

  const rewards = await prisma.reward.findMany({
    where: { cafeId: cafe.id, active: true },
    orderBy: { pointsCost: 'asc' },
    select: { id: true, name: true, pointsCost: true, emoji: true },
  })

  return NextResponse.json({
    cafe: {
      id: cafe.id,
      slug: cafe.slug,
      name: cafe.name,
      currency_symbol: cafe.currencySymbol,
      stamps_enabled: cafe.stampEnabled,
      stamps_required: cafe.stampsRequired,
      stamp_reward: cafe.stampReward,
      min_purchase_for_stamp: cafe.minPurchaseForStamp,
      points_enabled: cafe.pointsEnabled,
      points_per_currency_unit: cafe.pointsPerPeso,
      referral_enabled: cafe.referralEnabled,
    },
    rewards,
  })
}
