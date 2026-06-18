import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ChangePasswordForm from '@/components/dashboard/ChangePasswordForm'

export default async function ChangePasswordPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect(`/${cafeSlug}/login`)
  if (!session.user.mustChangePassword) redirect(`/${cafeSlug}/admin`)

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: { name: true, primaryColor: true, slug: true },
  })
  if (!cafe) redirect('/')

  const isOwner = session.user.role === 'owner'
  const redirectTo = isOwner ? `/${cafeSlug}/admin` : `/${cafeSlug}/caja`

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FCFBF8' }}>
      <div className="w-full max-w-sm px-6">
        <div className="rounded-[24px] p-8" style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.06)' }}>
          <div className="mb-6">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-5 text-white text-lg"
              style={{ background: '#43352C' }}
            >
              🔑
            </div>
            <h1 className="font-serif font-medium text-lg mb-1" style={{ color: '#43352C' }}>Cambiá tu contraseña</h1>
            <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>Es tu primer inicio de sesión. Por seguridad, establecé una contraseña propia.</p>
          </div>
          <ChangePasswordForm primaryColor={cafe.primaryColor} redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  )
}
