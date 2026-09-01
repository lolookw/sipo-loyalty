import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import LoyaltyPage from '@/components/customer/LoyaltyPage'
import { PUBLIC_CAFE_SELECT } from '@/lib/publicCafe'

export const revalidate = 3600

export default async function CafeLoyaltyPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  // Mismo criterio que la home del café: la página es pública y LoyaltyPage es un componente
  // cliente, así que solo viajan los campos públicos (ver lib/publicCafe.ts).
  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: PUBLIC_CAFE_SELECT,
  })
  if (!cafe || !cafe.loyaltyEnabled) notFound()
  return <LoyaltyPage cafe={cafe} />
}
