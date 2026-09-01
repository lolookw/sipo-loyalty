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

    // /[cafeSlug]/admin/* → owner de ese café o superadmin
    const cafeAdminMatch = pathname.match(/^\/([^/]+)\/admin(\/|$)/)
    if (cafeAdminMatch && cafeAdminMatch[1] !== 'admin') {
      const slug = cafeAdminMatch[1]
      if (
        token?.role !== 'superadmin' &&
        !(token?.role === 'owner' && token?.cafeSlug === slug)
      ) {
        return NextResponse.redirect(new URL(`/${slug}/login`, req.url))
      }
    }

    // /dashboard/* es el panel viejo, anterior a /[cafeSlug]/admin. Sigue existiendo pero quedó
    // atrás: no tiene campañas, referidos, difusión, analítica ni facturación, y su pantalla de
    // configuración recibe la lista de cajeros vacía (el dueño podía pensar que se le borraron).
    // Encima estaba fuera del matcher, así que ahí NO corría el "cambiá tu contraseña temporal".
    // /login manda a todo el mundo acá, así que cada rol se deriva a su panel real.
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      if (token?.role === 'superadmin') return NextResponse.redirect(new URL('/admin', req.url))
      if (token?.cafeSlug) {
        const dest = token.role === 'cashier' ? 'caja' : 'admin'
        return NextResponse.redirect(new URL(`/${token.cafeSlug}/${dest}`, req.url))
      }
      if (!token) return NextResponse.redirect(new URL('/login', req.url))
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
    '/:cafeSlug/caja',
    '/:cafeSlug/caja/:path*',
    '/:cafeSlug/change-password',
  ],
}
