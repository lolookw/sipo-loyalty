import { prisma } from '@/lib/prisma'
import BroadcastsManager from '@/components/dashboard/BroadcastsManager'

export default async function CafeBroadcastsPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const cafe = await prisma.cafe.findUnique({ where: { slug: cafeSlug }, select: { id: true, slug: true } })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>

  const [recipientCount, broadcasts] = await Promise.all([
    prisma.customerCafe.count({ where: { cafeId: cafe.id, marketingOptOut: false } }),
    prisma.broadcast.findMany({ where: { cafeId: cafe.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ])

  return (
    <BroadcastsManager
      cafeSlug={cafe.slug}
      recipientCount={recipientCount}
      initialBroadcasts={broadcasts.map(b => ({ ...b, createdAt: b.createdAt.toISOString(), completedAt: b.completedAt?.toISOString() ?? null }))}
    />
  )
}
