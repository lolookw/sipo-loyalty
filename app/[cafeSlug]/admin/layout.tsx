import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminSidebar from '@/components/dashboard/AdminSidebar'

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

  // Superadmin puede entrar a cualquier café
  if (role !== 'superadmin' && sessionSlug !== cafeSlug) {
    redirect(`/${cafeSlug}/login`)
  }

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: { id: true, slug: true, name: true, primaryColor: true },
  })
  if (!cafe) redirect('/')

  return (
    <div className="min-h-screen flex" style={{ background: '#FCFBF8' }}>
      <AdminSidebar cafe={cafe} userName={session.user.name || ''} isSuperAdmin={role === 'superadmin'} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
