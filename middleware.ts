import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Salir inmediatamente para páginas de login — nunca redirigir desde ahí
    if (
      pathname.startsWith('/admin/login') ||
      pathname.match(/^\/[^/]+\/login$/)
    ) {
      return NextResponse.next()
    }

    // Super admin: /admin y /admin/*
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      if (token?.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }
    }

    // /[cafeSlug]/admin/*, /[cafeSlug]/cartel y /[cafeSlug]/redes → owner de ese café o superadmin.
    // El cartel y las piezas para redes viven fuera de /admin a propósito (son lienzos a sangre
    // para imprimir o exportar, no pueden heredar la barra lateral del panel), pero son
    // herramientas del dueño: se guardan con el mismo umbral, y así también les corre el cambio
    // de contraseña temporal.
    const cafeAdminMatch = pathname.match(/^\/([^/]+)\/(?:admin|cartel|redes)(\/|$)/)
    if (cafeAdminMatch && cafeAdminMatch[1] !== 'admin') {
      const slug = cafeAdminMatch[1]
      if (
        token?.role !== 'superadmin' &&
        !(token?.role === 'owner' && token?.cafeSlug === slug)
      ) {
        return NextResponse.redirect(new URL(`/${slug}/login`, req.url))
      }
    }

    // /dashboard ya no tiene páginas propias: era el panel viejo, anterior a /[cafeSlug]/admin,
    // y se retiró (no tenía campañas, referidos, difusión, analítica ni facturación, y su
    // configuración mostraba la lista de cajeros vacía). Lo que queda es este ruteo, que sirve
    // para dos cosas: es el destino neutro al que /login manda después de autenticar, y sostiene
    // los links y favoritos viejos. Como no hay página detrás, TODA rama tiene que redirigir.
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      if (!token) return NextResponse.redirect(new URL('/login', req.url))
      if (token.role === 'superadmin') return NextResponse.redirect(new URL('/admin', req.url))
      if (token.cafeSlug) {
        const dest = token.role === 'cashier' ? 'caja' : 'admin'
        return NextResponse.redirect(new URL(`/${token.cafeSlug}/${dest}`, req.url))
      }
      // Sesión sin café (no debería pasar: un alta siempre crea café y dueño juntos).
      return NextResponse.redirect(new URL('/', req.url))
    }

    // /[cafeSlug]/caja/* → cajero, owner o superadmin de ese café
    const cajaMatch = pathname.match(/^\/([^/]+)\/caja(\/|$)/)
    if (cajaMatch) {
      const slug = cajaMatch[1]
      if (
        token?.role !== 'superadmin' &&
        !(token?.cafeSlug === slug && (token?.role === 'owner' || token?.role === 'cashier'))
      ) {
        return NextResponse.redirect(new URL(`/${slug}/login`, req.url))
      }
    }

    // mustChangePassword: forzar cambio antes de entrar
    if (token?.mustChangePassword) {
      const cafeSlug = token.cafeSlug
      const isChangePw = pathname.endsWith('/change-password')
      if (!isChangePw) {
        const dest = cafeSlug ? `/${cafeSlug}/change-password` : '/change-password'
        if (pathname !== dest) {
          return NextResponse.redirect(new URL(dest, req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Siempre dejar pasar — el control de acceso lo hacemos en la función principal
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/:cafeSlug/admin',
    '/:cafeSlug/admin/:path*',
    '/:cafeSlug/cartel',
    '/:cafeSlug/redes',
    '/:cafeSlug/caja',
    '/:cafeSlug/caja/:path*',
    '/:cafeSlug/change-password',
  ],
}
