import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import LoyaltyPage from '@/components/customer/LoyaltyPage'

export const revalidate = 3600

export default async function CafeLoyaltyPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    include: { rewards: { where: { active: true }, orderBy: { pointsCost: 'asc' } } },
  })
  if (!cafe || !cafe.loyaltyEnabled) notFound()
  return <LoyaltyPage cafe={cafe} />
}
