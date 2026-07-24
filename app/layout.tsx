import type { Metadata } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://sipo.ar'),
  title: {
    default: 'Sipo',
    template: '%s | Sipo',
  },
  description:
    'Acumulá sellos y puntos en tus cafeterías favoritas. Sin app que descargar, sin tarjetas físicas. Programa de fidelidad digital para cafeterías en Argentina.',
  keywords: [
    'programa de fidelidad cafetería',
    'loyalty cafetería argentina',
    'sellos cafetería',
    'puntos cafetería',
    'fidelización clientes',
    'café digital',
  ],
  authors: [{ name: 'Sipo', url: 'https://sipo.ar' }],
  creator: 'Sipo',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://sipo.ar',
    siteName: 'Sipo',
    title: 'Sipo — Fidelización para cafeterías',
    description:
      'Acumulá sellos y puntos en tus cafeterías favoritas. Sin app, sin tarjetas, solo tu email.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Sipo — Fidelización para cafeterías' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sipo — Fidelización para cafeterías',
    description: 'Acumulá sellos y puntos en tus cafeterías favoritas. Sin app, sin tarjetas.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sipo',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export const viewport = {
  themeColor: '#43352C',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cormorantGaramond.variable} ${manrope.variable}`}>
      <body className="font-sans antialiased">
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  )
}
