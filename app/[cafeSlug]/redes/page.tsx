import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getCafeBySlugIfAuthorized } from '@/lib/cafeAuth'
import SocialAssetsExport from '@/components/dashboard/SocialAssetsExport'

export const metadata: Metadata = {
  title: 'Piezas para Instagram',
  robots: { index: false, follow: false },
}

export default async function SocialAssetsPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/${cafeSlug}/login`)

  // Mismo umbral que el cartel de mostrador (ver cartel/page.tsx): el middleware ya lo frena
  // antes, esto es la segunda capa. Se valida contra la propiedad real del café y no contra el
  // slug de la sesión, que solo guarda el del primer café — ver lib/cafeAuth.ts.
  const cafe = await getCafeBySlugIfAuthorized(cafeSlug, session, 'owner')
  if (!cafe) redirect(`/${cafeSlug}/login`)

  // La URL del QR se arma en el servidor con el dominio canónico, igual que en el cartel: si la
  // resolviera el navegador, el QR se dibujaría primero con un dominio y se corregiría al
  // hidratar — y quien exporte rápido se lleva el equivocado.
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://www.sipo.ar'

  return (
    <SocialAssetsExport
      cafe={{
        slug: cafe.slug,
        name: cafe.name,
        logoUrl: cafe.logoUrl,
        primaryColor: cafe.primaryColor,
        accentColor: cafe.accentColor,
        stampEnabled: cafe.stampEnabled,
        pointsEnabled: cafe.pointsEnabled,
        loyaltyEnabled: cafe.loyaltyEnabled,
      }}
      loyaltyUrl={`${baseUrl}/${cafe.slug}/loyalty`}
    />
  )
}
