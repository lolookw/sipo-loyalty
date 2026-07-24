import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePlan, isServiceLimited } from '@/lib/planStatus'
import { getPlatformConfig } from '@/lib/platformConfig'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function CafeSettingsPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    include: { staff: { orderBy: { createdAt: 'desc' } } },
  })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>

  // La API es un beneficio del plan pago (en prueba/vencido no se ofrece)
  const { graceDays } = await getPlatformConfig()
  const apiAllowed = !isServiceLimited(getEffectivePlan(cafe, graceDays))

  return (
    <SettingsForm
      cafe={cafe}
      cafeStaff={cafe.staff}
      isSuperAdmin={session?.user.role === 'superadmin'}
      apiAllowed={apiAllowed}
    />
  )
}
