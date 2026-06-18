import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardHome from '@/components/dashboard/DashboardHome'
import CajaHeader from '@/components/dashboard/CajaHeader'
import { Clock } from 'lucide-react'

export default async function CajaPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect(`/${cafeSlug}/login`)

  const canAccessCafe =
    session.user.role === 'superadmin' ||
    ((session.user.role === 'owner' || session.user.role === 'cashier') && session.user.cafeSlug === cafeSlug)

  if (!canAccessCafe) redirect(`/${cafeSlug}/login`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [cafe, recentTransactions] = await Promise.all([
    prisma.cafe.findUnique({
      where: { slug: cafeSlug },
      include: { rewards: { where: { active: true }, orderBy: { pointsCost: 'asc' } } },
    }),
    prisma.transaction.findMany({
      where: { cafe: { slug: cafeSlug }, createdAt: { gte: today } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])
  if (!cafe) redirect('/')

  return (
    <div className="min-h-screen" style={{ background: '#FCFBF8' }}>
      <CajaHeader cafe={{ name: cafe.name, slug: cafe.slug }} userName={session.user.name || ''} />

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Panel principal */}
        <div className="lg:col-span-3">
          <DashboardHome cafe={cafe} />
        </div>

        {/* Historial del día */}
        <div className="lg:col-span-2">
          <div
            className="rounded-[24px] p-5"
            style={{
              background: 'white',
              border: '1px solid #E9DED1',
              boxShadow: '0 8px 30px rgba(67,53,44,0.04)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} style={{ color: '#6B6B6B' }} />
              <h2 className="font-sans text-sm font-semibold" style={{ color: '#43352C' }}>
                Movimientos de hoy
              </h2>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="font-sans text-xs text-center py-6" style={{ color: '#C0B4A8' }}>
                Sin movimientos aún.
              </p>
            ) : (
              <div className="space-y-0">
                {recentTransactions.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-start gap-2.5 py-2.5 last:border-0"
                    style={{ borderBottom: '1px solid #F6F0E8' }}
                  >
                    <div className="text-base leading-none mt-0.5">
                      {tx.type === 'stamp_add'    ? '☕' :
                       tx.type === 'stamp_redeem' ? '🎟' :
                       tx.type === 'points_add'   ? '⭐' : '🎁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-xs font-medium truncate" style={{ color: '#43352C' }}>
                        {tx.customer.name}
                      </div>
                      <div className="font-sans text-xs" style={{ color: '#6B6B6B' }}>
                        {tx.type === 'stamp_add'    && '+1 sello'}
                        {tx.type === 'stamp_redeem' && 'Sello canjeado'}
                        {tx.type === 'points_add'   && `+${Math.floor(tx.points ?? 0)} pts`}
                        {tx.type === 'points_redeem' && tx.note}
                      </div>
                    </div>
                    <div className="font-sans text-xs flex-shrink-0" style={{ color: '#C0B4A8' }}>
                      {new Date(tx.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
