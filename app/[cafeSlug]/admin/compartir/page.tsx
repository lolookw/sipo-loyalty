import { prisma } from '@/lib/prisma'
import ShareCafe from '@/components/dashboard/ShareCafe'

export default async function CompartirPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: { slug: true, primaryColor: true },
  })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>

  // Las URLs de los QR se arman en el servidor con el dominio canónico. Antes se resolvían con
  // window.location.origin, que durante el render del servidor queda vacío: el QR se dibujaba
  // primero con una ruta relativa y se corregía al hidratar, así que quien lo escaneaba o
  // capturaba rápido se llevaba uno inservible.
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://www.sipo.ar'

  return (
    <ShareCafe
      cafeSlug={cafe.slug}
      primaryColor={cafe.primaryColor}
      loyaltyUrl={`${baseUrl}/${cafe.slug}/loyalty`}
      homeUrl={`${baseUrl}/${cafe.slug}`}
    />
  )
}
