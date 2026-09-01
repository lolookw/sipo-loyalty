import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CafeHomePage from '@/components/customer/CafeHomePage'
import { PUBLIC_CAFE_SELECT } from '@/lib/publicCafe'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: { slug: true, name: true, description: true, logoUrl: true, coverUrl: true },
  })
  if (!cafe) return {}

  const description =
    cafe.description ||
    `Visitá ${cafe.name} en Sipo y acumulá sellos y puntos con cada compra.`

  const ogImage = cafe.coverUrl || cafe.logoUrl || '/opengraph-image'

  return {
    title: cafe.name,
    description,
    openGraph: {
      title: cafe.name,
      description,
      url: `https://sipo.ar/${cafe.slug}`,
      images: [{ url: ogImage, alt: cafe.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: cafe.name,
      description,
      images: [ogImage],
    },
  }
}

export default async function CafeSlugPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  // Solo los campos públicos: el componente es 'use client', así que todo lo que reciba viaja
  // dentro del HTML de una página abierta a cualquiera (ver lib/publicCafe.ts).
  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: PUBLIC_CAFE_SELECT,
  })
  if (!cafe) notFound()
  return <CafeHomePage cafe={cafe} />
}
