import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const cafes = await prisma.cafe.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, slug: true, name: true, primaryColor: true },
  })

  return (
    <div className="min-h-screen flex bg-zinc-50">
      <DashboardSidebar cafes={cafes} ownerName={session.user.name || ''} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
