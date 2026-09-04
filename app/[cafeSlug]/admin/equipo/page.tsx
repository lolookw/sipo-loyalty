import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import StaffManager from '@/components/dashboard/StaffManager'
import PasswordCard from '@/components/dashboard/PasswordCard'

export default async function EquipoPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: {
      id: true, primaryColor: true,
      staff: { orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true } },
    },
  })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>

  // El superadmin entra a cualquier café: cambiarle la contraseña acá sería cambiar la suya, no la
  // del dueño — por eso la tarjeta solo se muestra al usuario propio del café.
  const isSuperAdmin = session?.user.role === 'superadmin'

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>
          Equipo
        </h1>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          Quién puede entrar a la caja y tu propio acceso.
        </p>
      </div>

      <div className="space-y-4">
        <StaffManager cafeId={cafe.id} initialStaff={cafe.staff} primaryColor={cafe.primaryColor} />
        {!isSuperAdmin && <PasswordCard primaryColor={cafe.primaryColor} />}
      </div>
    </div>
  )
}
