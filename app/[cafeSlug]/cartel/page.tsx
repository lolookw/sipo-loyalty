import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getCafeBySlugIfAuthorized } from '@/lib/cafeAuth'
import CounterSignPrint from '@/components/dashboard/CounterSignPrint'

export const metadata: Metadata = {
  title: 'Cartel para el mostrador',
  robots: { index: false, follow: false },
}

export default async function CounterSignPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/${cafeSlug}/login`)

  // Mismo umbral que el panel (el middleware ya lo frena antes; esto es la segunda capa).
  // Se valida contra la propiedad real del café y no contra el slug de la sesión, que solo
  // guarda el del primer café — ver lib/cafeAuth.ts.
  const cafe = await getCafeBySlugIfAuthorized(cafeSlug, session, 'owner')
  if (!cafe) redirect(`/${cafeSlug}/login`)

  // La URL del QR se arma en el servidor con el dominio canónico. Si la resolviera el navegador,
  // el QR se dibujaría primero con un dominio y se corregiría al hidratar — y quien imprima rápido
  // se lleva el equivocado. Ojo con el www: sipo.ar responde 307 y hay lectores que no lo siguen.
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://www.sipo.ar'

  return (
    <CounterSignPrint
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
