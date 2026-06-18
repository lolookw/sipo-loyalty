import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: session!.user!.id as string },
  })
  if (!cafe) return <div className="p-8 text-gray-400">No café found.</div>
  return <SettingsForm cafe={cafe} cafeStaff={[]} isSuperAdmin={false} />
}
