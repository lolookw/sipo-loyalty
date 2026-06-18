import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardHome from '@/components/dashboard/DashboardHome'
import { Users, Coffee, Star, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: session!.user!.id as string },
    include: { rewards: { where: { active: true }, orderBy: { pointsCost: 'asc' } } },
  })
  if (!cafe) return (
    <div className="p-8 font-sans text-sm" style={{ color: '#a8a29e' }}>
      No tenés ningún café configurado aún.
    </div>
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalCustomers, stampsThisMonth, pointsData, redemptions] = await Promise.all([
    prisma.customerCafe.count({ where: { cafeId: cafe.id } }),
    prisma.transaction.count({
      where: { cafeId: cafe.id, type: 'stamp_add', createdAt: { gte: startOfMonth } },
    }),
    prisma.customerCafe.aggregate({
      where: { cafeId: cafe.id },
      _sum: { points: true },
    }),
    prisma.transaction.count({
      where: { cafeId: cafe.id, type: { in: ['stamp_redeem', 'points_redeem'] } },
    }),
  ])

  const totalPoints = Math.floor(pointsData._sum.points ?? 0)

  const stats = [
    { label: 'Clientes',       value: totalCustomers.toLocaleString(),  icon: Users },
    { label: 'Sellos este mes', value: stampsThisMonth.toLocaleString(), icon: Coffee },
    { label: 'Puntos activos', value: totalPoints.toLocaleString(),     icon: Star },
    { label: 'Premios canjeados', value: redemptions.toLocaleString(),  icon: TrendingUp },
  ]

  return (
    <div>
      {/* Stats */}
      <div className="px-8 pt-8 pb-0 max-w-xl mx-auto">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl p-4"
              style={{ background: 'white', border: '1px solid #ede7de' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Icon size={12} style={{ color: '#c8bfb4' }} />
                <span className="font-sans text-xs" style={{ color: '#a8a29e' }}>{label}</span>
              </div>
              <div className="font-serif font-medium text-2xl leading-none" style={{ color: '#1C1917' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DashboardHome cafe={cafe} />
    </div>
  )
}
