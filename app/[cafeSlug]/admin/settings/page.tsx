import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function CafeSettingsPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    include: { staff: { orderBy: { createdAt: 'desc' } } },
  })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>

  return <SettingsForm cafe={cafe} cafeStaff={cafe.staff} isSuperAdmin={session?.user.role === 'superadmin'} />
}
