import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminSidebar from '@/components/dashboard/AdminSidebar'
import { capacityPercent } from '@/lib/planStatus'
import { getPlatformConfig } from '@/lib/platformConfig'

export default async function CafeAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ cafeSlug: string }>
}) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect(`/${cafeSlug}/login`)

  const { role, cafeSlug: sessionSlug } = session.user

  // El panel es del dueño (o del superadmin, que entra a cualquier café). El cajero tiene la
  // sesión con el slug de su café, así que comparar solo slugs lo dejaba pasar: el middleware lo
  // frenaba igual, pero las dos capas tienen que decir lo mismo — su pantalla es /caja.
  const canAccess = role === 'superadmin' || (role === 'owner' && sessionSlug === cafeSlug)
  if (!canAccess) {
    redirect(role === 'cashier' ? `/${cafeSlug}/caja` : `/${cafeSlug}/login`)
  }

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: {
      id: true, slug: true, name: true, primaryColor: true, onboardingSeenAt: true,
      planTier: true, customerLimit: true, _count: { select: { customers: true } },
    },
  })
  if (!cafe) redirect('/')

  const { capacityWarningPercent } = await getPlatformConfig()
  const percent = capacityPercent(cafe, cafe._count.customers)
  const nearCapacity = percent !== null && percent >= capacityWarningPercent

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#FCFBF8' }}>
      <AdminSidebar
        cafe={cafe}
        userName={session.user.name || ''}
        isSuperAdmin={role === 'superadmin'}
        isOwner={role === 'owner'}
        nearCapacity={nearCapacity}
      />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  )
}
