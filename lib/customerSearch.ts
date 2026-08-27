// Búsqueda rápida de clientes de un café — compartida por el panel (/api/customer?search=,
// sesión) y la API pública (/api/v1/customers/search, API key). Nombre o inicio de email.
import type { PrismaClient } from '@prisma/client'

export async function searchCafeCustomers(db: PrismaClient, cafeId: string, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase()
  if (q.length < 2) return []

  return db.customer.findMany({
    where: {
      cafes: { some: { cafeId } },
      OR: [
        { email: { startsWith: q } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: { cafes: { where: { cafeId } } },
    orderBy: { name: 'asc' },
    take: 6,
  })
}
