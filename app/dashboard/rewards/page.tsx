import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import RewardsManager from '@/components/dashboard/RewardsManager'

export default async function RewardsPage() {
  const session = await getServerSession(authOptions)
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: session!.user!.id as string },
    include: { rewards: { orderBy: { pointsCost: 'asc' } } },
  })
  if (!cafe) return <div className="p-8 text-gray-400">No café found.</div>
  return <RewardsManager cafe={cafe} initialRewards={cafe.rewards} />
}
