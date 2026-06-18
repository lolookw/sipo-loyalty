import { prisma } from './prisma'

type Session = {
  user: { id: string; role: string; cafeSlug: string | null; email?: string | null }
}

/**
 * Verifica que el usuario de la sesión tenga acceso a operar sobre un café dado su ID.
 * Retorna el café si tiene acceso, null si no.
 */
export async function getCafeIfAuthorized(cafeId: string, session: Session) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } })
  if (!cafe) return null

  const { role, id, cafeSlug } = session.user

  if (role === 'superadmin') return cafe
  if (role === 'owner' && cafe.ownerId === id) return cafe
  if ((role === 'cashier' || role === 'owner') && cafe.slug === cafeSlug) return cafe

  return null
}
