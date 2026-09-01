// Validación del slug de una cafetería. Puro (sin DB) para poder testear los bordes.
//
// El slug es el primer segmento de la URL pública (/mi-cafe) y no se puede cambiar sin romper
// los links que ya circulan, así que conviene rechazarlo al crearlo y no descubrirlo después.

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/

// Rutas propias de la app que un café no puede pisar: con slug "admin" o "api" la cafetería
// quedaría inaccesible y además taparía pantallas de la plataforma.
export const RESERVED_SLUGS = [
  'admin', 'api', 'demo', 'login', 'sumate', 'developers', 'dashboard',
  'terminos', 'privacidad', 'unsubscribe', 'change-password', 'manifest',
]

export type SlugResult = { ok: true; slug: string } | { ok: false; error: string }

export function validateCafeSlug(raw: unknown): SlugResult {
  const slug = String(raw ?? '').trim().toLowerCase()

  if (!SLUG_REGEX.test(slug))
    return {
      ok: false,
      error: 'El slug tiene que ser de 2 a 40 caracteres, en minúsculas, solo letras, números y guiones (sin guion al principio ni al final).',
    }

  if (RESERVED_SLUGS.includes(slug))
    return { ok: false, error: `"${slug}" es una ruta reservada de Sipo. Elegí otro slug.` }

  return { ok: true, slug }
}
