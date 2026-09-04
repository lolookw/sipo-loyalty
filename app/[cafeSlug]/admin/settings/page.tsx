import { prisma } from '@/lib/prisma'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function CafeSettingsPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params

  const cafe = await prisma.cafe.findUnique({ where: { slug: cafeSlug } })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>

  // Cuántos clientes tienen cada cantidad de sellos. Sirve para avisarle al dueño, mientras baja
  // "sellos para completar", a cuántos les va a quedar un excedente que se pierde al canjear
  // (canjear deja la tarjeta en 0, no resta). Es una sola fila por valor posible de sellos, así
  // que el aviso se calcula en el navegador sin ir y volver al servidor en cada tecla.
  const stampGroups = await prisma.customerCafe.groupBy({
    by: ['stamps'],
    where: { cafeId: cafe.id, stamps: { gt: 0 } },
    _count: { _all: true },
  })
  const stampHistogram = stampGroups.map(g => ({ stamps: g.stamps, count: g._count._all }))

  return <SettingsForm cafe={cafe} stampHistogram={stampHistogram} />
}
