import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import CreateCafeForm from '@/components/admin/CreateCafeForm'
import SuperAdminCafeList from '@/components/admin/SuperAdminCafeList'
import PlatformConfigForm from '@/components/admin/PlatformConfigForm'
import SignupRequestsList from '@/components/admin/SignupRequestsList'
import { ShieldCheck, LogOut } from 'lucide-react'
import SuperAdminSignOut from '@/components/admin/SuperAdminSignOut'

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin') redirect('/admin/login')

  const sp = await searchParams

  const [cafes, platformConfig, signupRequests] = await Promise.all([
    prisma.cafe.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        _count: { select: { customers: true, staff: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.platformConfig.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    }),
    prisma.cafeSignupRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Prefill del formulario de nueva cafetería desde un lead (botón "Crear café")
  const createInitial = {
    ownerName: sp.poName,
    ownerEmail: sp.poEmail,
    cafeName: sp.poCafe,
    cafeSlug: sp.poSlug,
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldCheck size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Sipo · Super Admin</h1>
            <p className="text-xs text-zinc-500">{session.user.email}</p>
          </div>
        </div>
        <SuperAdminSignOut />
      </div>

      <div className="max-w-4xl mx-auto p-8 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-white">{cafes.length}</div>
            <div className="text-zinc-500 text-sm mt-1">Cafeterías</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-white">
              {cafes.reduce((acc, c) => acc + c._count.customers, 0)}
            </div>
            <div className="text-zinc-500 text-sm mt-1">Clientes totales</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-white">
              {cafes.reduce((acc, c) => acc + c._count.staff, 0)}
            </div>
            <div className="text-zinc-500 text-sm mt-1">Cajeros registrados</div>
          </div>
        </div>

        {/* Solicitudes de alta (leads) */}
        <div>
          <h2 className="text-base font-semibold text-white mb-4">
            Solicitudes de alta <span className="text-zinc-500 font-normal">({signupRequests.length})</span>
          </h2>
          <SignupRequestsList
            requests={signupRequests.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))}
          />
        </div>

        {/* Configuración de la plataforma */}
        <div>
          <h2 className="text-base font-semibold text-white mb-4">Configuración de la plataforma</h2>
          <PlatformConfigForm config={platformConfig} />
        </div>

        {/* Nueva cafetería */}
        <div id="nueva-cafeteria">
          <h2 className="text-base font-semibold text-white mb-4">Nueva cafetería</h2>
          <CreateCafeForm initial={createInitial} />
        </div>

        {/* Lista de cafeterías */}
        <div>
          <h2 className="text-base font-semibold text-white mb-4">
            Cafeterías registradas <span className="text-zinc-500 font-normal">({cafes.length})</span>
          </h2>
          <SuperAdminCafeList cafes={cafes} graceDays={platformConfig.graceDays} />
        </div>
      </div>
    </div>
  )
}
