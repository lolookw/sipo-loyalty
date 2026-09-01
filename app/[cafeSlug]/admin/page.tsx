import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardHome from '@/components/dashboard/DashboardHome'
import { Users, Coffee, Star, TrendingUp } from 'lucide-react'

export default async function CafeAdminPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    include: { rewards: { where: { active: true }, orderBy: { pointsCost: 'asc' } } },
  })
  if (!cafe) return (
    <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>
      Cafetería no encontrada.
    </div>
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalCustomers, stampsThisMonth, pointsData, redemptions] = await Promise.all([
    prisma.customerCafe.count({ where: { cafeId: cafe.id } }),
    prisma.transaction.count({
      where: { cafeId: cafe.id, type: 'stamp_add', createdAt: { gte: startOfMonth } },
    }),
    prisma.customerCafe.aggregate({ where: { cafeId: cafe.id }, _sum: { points: true } }),
    prisma.transaction.count({
      where: { cafeId: cafe.id, type: { in: ['stamp_redeem', 'points_redeem'] } },
    }),
  ])

  const stats = [
    { label: 'Clientes', value: totalCustomers.toLocaleString(), icon: Users },
    { label: 'Sellos este mes', value: stampsThisMonth.toLocaleString(), icon: Coffee },
    { label: 'Puntos activos', value: Math.floor(pointsData._sum.points ?? 0).toLocaleString(), icon: Star },
    { label: 'Premios canjeados', value: redemptions.toLocaleString(), icon: TrendingUp },
  ]

  return (
    <div>
      <div className="px-8 pt-8 pb-0 max-w-xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-[20px] p-4"
              style={{
                background: 'white',
                border: '1px solid #E9DED1',
                boxShadow: '0 4px 16px rgba(67,53,44,0.03)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} style={{ color: '#6B6B6B' }} />
                <span className="font-sans text-xs font-medium" style={{ color: '#6B6B6B' }}>{label}</span>
              </div>
              <div className="font-sans text-xl font-bold tracking-tight" style={{ color: '#43352C' }}>
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
