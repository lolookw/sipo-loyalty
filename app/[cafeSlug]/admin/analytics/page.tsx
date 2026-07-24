import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'
import { bucketWeekly, bucketHourly, countRecurring } from '@/lib/analytics'

const DAY = 24 * 60 * 60 * 1000
const AR_OFFSET_H = 3 // Argentina = UTC-3 (sin horario de verano)

export default async function AnalyticsPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const cafe = await prisma.cafe.findUnique({ where: { slug: cafeSlug }, select: { id: true, currencySymbol: true } })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>

  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * DAY)
  const d56 = new Date(now.getTime() - 56 * DAY) // 8 semanas
  const d90 = new Date(now.getTime() - 90 * DAY)

  const [totalCustomers, newCustomers30, revenue30, redemptions, recurringRows, txWeeks, txHours] = await Promise.all([
    prisma.customerCafe.count({ where: { cafeId: cafe.id } }),
    prisma.customerCafe.count({ where: { cafeId: cafe.id, createdAt: { gte: d30 } } }),
    prisma.transaction.aggregate({ where: { cafeId: cafe.id, createdAt: { gte: d30 }, amount: { not: null } }, _sum: { amount: true } }),
    prisma.transaction.count({ where: { cafeId: cafe.id, type: { in: ['stamp_redeem', 'points_redeem'] } } }),
    // referral_reward se excluye: es un premio acreditado, no una visita real
    prisma.transaction.groupBy({ by: ['customerId'], where: { cafeId: cafe.id, type: { not: 'referral_reward' } }, _count: { _all: true } }),
    prisma.transaction.findMany({ where: { cafeId: cafe.id, type: { not: 'referral_reward' }, createdAt: { gte: d56 } }, select: { createdAt: true } }),
    prisma.transaction.findMany({ where: { cafeId: cafe.id, type: { not: 'referral_reward' }, createdAt: { gte: d90 } }, select: { createdAt: true } }),
  ])

  const recurring = countRecurring(recurringRows.map(r => r._count._all))
  const weekly = bucketWeekly(txWeeks.map(t => t.createdAt), now)
  const hourly = bucketHourly(txHours.map(t => t.createdAt), AR_OFFSET_H)

  return (
    <AnalyticsDashboard
      currencySymbol={cafe.currencySymbol}
      kpis={{
        totalCustomers,
        newCustomers30,
        recurring,
        revenue30: Math.round(revenue30._sum.amount ?? 0),
        redemptions,
      }}
      weekly={weekly}
      hourly={hourly}
    />
  )
}
