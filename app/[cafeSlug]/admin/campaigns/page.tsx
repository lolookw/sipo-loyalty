import { prisma } from '@/lib/prisma'
import CampaignsManager from '@/components/dashboard/CampaignsManager'

export default async function CafeCampaignsPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    include: { campaigns: { orderBy: { startsAt: 'desc' } } },
  })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>
  return (
    <CampaignsManager
      cafe={cafe}
      initialCampaigns={cafe.campaigns.map(c => ({
        ...c,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
      }))}
    />
  )
}
