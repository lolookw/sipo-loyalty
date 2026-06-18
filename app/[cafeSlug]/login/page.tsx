import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import CafeLoginForm from '@/components/dashboard/CafeLoginForm'

export default async function CafeLoginPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: { name: true, primaryColor: true, slug: true },
  })
  if (!cafe) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FCFBF8' }}>
      <div className="w-full max-w-sm px-6">
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'white',
            border: '1px solid #E9DED1',
            boxShadow: '0 8px 30px rgba(67,53,44,0.06)',
          }}
        >
          <div className="mb-8">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-6 text-base"
              style={{ background: '#43352C' }}
            >
              ☕
            </div>
            <h1
              className="font-serif font-semibold mb-1"
              style={{ fontSize: '1.6rem', color: '#43352C' }}
            >
              {cafe.name}
            </h1>
            <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
              Panel de administración
            </p>
          </div>
          <CafeLoginForm cafeSlug={cafe.slug} primaryColor={cafe.primaryColor} />
        </div>
      </div>
    </div>
  )
}
