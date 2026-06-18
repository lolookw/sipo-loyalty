import { prisma } from '@/lib/prisma'
import RewardsManager from '@/components/dashboard/RewardsManager'

export default async function CafeRewardsPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    include: { rewards: { orderBy: { pointsCost: 'asc' } } },
  })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>
  return <RewardsManager cafe={cafe} initialRewards={cafe.rewards} />
}
