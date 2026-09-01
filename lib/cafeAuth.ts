import { prisma } from './prisma'

type Session = {
  user: { id: string; role: string; cafeSlug: string | null; email?: string | null }
}

/**
 * Dos niveles de acceso a un café:
 *  • 'staff'  → dueño, cajero o superadmin. Para lo que se opera desde la caja.
 *  • 'owner'  → solo dueño o superadmin. Para todo lo que un cajero NO debería poder hacer:
 *               tocar la configuración, ver/exportar la base de clientes entera, mandar
 *               difusiones, crear campañas o premios.
 *
 * La distinción importa porque el cajero tiene sesión con el `cafeSlug` de su café: cualquier
 * chequeo que solo compare slugs lo deja pasar como si fuera el dueño.
 */
export type CafeAccessLevel = 'staff' | 'owner'

type AccessCafe = { slug: string; ownerId: string }

/** Decisión pura (sin DB) — se testea sola en _test/. */
export function canAccessCafe(cafe: AccessCafe, session: Session, level: CafeAccessLevel): boolean {
  const { role, id, cafeSlug } = session.user

  if (role === 'superadmin') return true
  // El dueño se valida contra ownerId y no contra el slug de la sesión: el token solo guarda el
  // slug del PRIMER café, así que un dueño con más de uno quedaba afuera de los suyos.
  if (role === 'owner' && cafe.ownerId === id) return true
  if (level === 'staff' && role === 'cashier' && cafe.slug === cafeSlug) return true

  return false
}

/**
 * Verifica que el usuario de la sesión tenga acceso a operar sobre un café dado su ID.
 * Retorna el café si tiene acceso, null si no.
 */
export async function getCafeIfAuthorized(cafeId: string, session: Session, level: CafeAccessLevel = 'staff') {
  if (typeof cafeId !== 'string' || !cafeId) return null
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } })
  if (!cafe) return null
  return canAccessCafe(cafe, session, level) ? cafe : null
}

/** Igual que la anterior pero por slug (rutas /api/cafe/[slug]/…). */
export async function getCafeBySlugIfAuthorized(slug: string, session: Session, level: CafeAccessLevel = 'staff') {
  if (typeof slug !== 'string' || !slug) return null
  const cafe = await prisma.cafe.findUnique({ where: { slug } })
  if (!cafe) return null
  return canAccessCafe(cafe, session, level) ? cafe : null
}
