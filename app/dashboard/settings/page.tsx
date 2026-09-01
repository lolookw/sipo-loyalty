import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePlan, isServiceLimited } from '@/lib/planStatus'
import { getPlatformConfig } from '@/lib/platformConfig'
import { getPlanTiers } from '@/lib/planTiers'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: session!.user!.id as string },
    include: { owner: { select: { email: true } } },
  })
  if (!cafe) return <div className="p-8 text-gray-400">No café found.</div>
  const { graceDays } = await getPlatformConfig()
  const tiers = await getPlanTiers()
  const apiAllowed = !isServiceLimited(getEffectivePlan(cafe, graceDays))
  return <SettingsForm cafe={cafe} cafeStaff={[]} isSuperAdmin={false} apiAllowed={apiAllowed} tiers={tiers} ownerEmail={cafe.owner.email} />
}
