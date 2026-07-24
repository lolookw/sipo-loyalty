import type { MetadataRoute } from 'next'

// Manifest PWA — permite "Agregar a inicio" y abrir Sipo como app (tarjeta en la billetera del teléfono).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sipo — Mi tarjeta de fidelidad',
    short_name: 'Sipo',
    description: 'Tus sellos y puntos en tus cafeterías favoritas, siempre a mano.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FCFBF8',
    theme_color: '#43352C',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
