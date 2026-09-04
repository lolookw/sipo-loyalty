'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Instagram, Printer } from 'lucide-react'

interface Props {
  cafeSlug: string
  primaryColor: string
  /** URLs resueltas en el servidor con el dominio canónico — ver comentario en la página. */
  loyaltyUrl: string
  homeUrl: string
}

function QrBlock({ url, title, path }: { url: string; title: string; path: string }) {
  return (
    <div className="text-center">
      <div
        className="w-32 h-32 rounded-xl mb-2 mx-auto flex items-center justify-center"
        style={{ border: '1px solid #E9DED1', background: '#FCFBF8' }}
      >
        {/* marginSize dibuja la zona de silencio DENTRO del SVG: sin ella el borde de la tarjeta
            queda demasiado cerca del código y algunos lectores no lo enganchan. */}
        <QRCodeSVG value={url} size={112} fgColor="#43352C" bgColor="#FCFBF8" level="M" marginSize={2} />
      </div>
      <div className="font-sans text-xs font-medium" style={{ color: '#43352C' }}>{title}</div>
      <div className="font-mono text-xs" style={{ color: '#9B9089' }}>{path}</div>
    </div>
  )
}

function ToolCard({ title, description, href, primaryColor, children }: {
  title: string
  description: string
  href: string
  primaryColor: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl p-4"
      style={{ background: '#F6F0E8', border: '1px solid #E9DED1' }}
    >
      <div className="flex-1">
        <div className="font-sans text-sm font-semibold" style={{ color: '#43352C' }}>{title}</div>
        <p className="font-sans text-xs mt-1 leading-relaxed" style={{ color: '#6B6B6B' }}>{description}</p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-sans font-semibold text-white text-xs hover:opacity-90 transition-opacity"
        style={{ background: primaryColor }}
      >
        {children}
      </a>
    </div>
  )
}

export default function ShareCafe({ cafeSlug, primaryColor, loyaltyUrl, homeUrl }: Props) {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>
          Compartir mi café
        </h1>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          Los códigos, carteles y piezas para que tus clientes te encuentren y se sumen.
        </p>
      </div>

      <div className="space-y-4">
        <div
          className="rounded-[24px] p-6"
          style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <h2
            className="font-sans text-sm font-semibold tracking-tight mb-5 pb-4"
            style={{ color: '#43352C', borderBottom: '1px solid #F6F0E8' }}
          >
            Códigos QR
          </h2>
          <div className="flex gap-8 flex-wrap">
            <QrBlock url={loyaltyUrl} title="Programa de fidelidad" path={`/${cafeSlug}/loyalty`} />
            <QrBlock url={homeUrl} title="Página principal" path={`/${cafeSlug}`} />
          </div>
        </div>

        <div
          className="rounded-[24px] p-6"
          style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <h2
            className="font-sans text-sm font-semibold tracking-tight mb-5 pb-4"
            style={{ color: '#43352C', borderBottom: '1px solid #F6F0E8' }}
          >
            Material listo para usar
          </h2>
          <div className="space-y-3">
            <ToolCard
              title="Cartel para el mostrador"
              description="Generá una versión plana o autoportante con tu logo, colores y QR. Usa la última configuración guardada."
              href={`/${cafeSlug}/cartel`}
              primaryColor={primaryColor}
            >
              <Printer size={14} /> Preparar cartel
            </ToolCard>
            <ToolCard
              title="Piezas para Instagram"
              description="Descargá story, feed cuadrado o feed vertical con tu logo, colores y QR para anunciar que usás Sipo."
              href={`/${cafeSlug}/redes`}
              primaryColor={primaryColor}
            >
              <Instagram size={14} /> Preparar piezas
            </ToolCard>
          </div>
        </div>
      </div>
    </div>
  )
}
