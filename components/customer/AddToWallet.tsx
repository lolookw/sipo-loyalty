'use client'

import { useEffect, useState } from 'react'
import { Smartphone, Share, Plus, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Props {
  style: React.CSSProperties
  textMain: string
  textMuted: string
  accent: string
}

/**
 * Botón "Agregar a mi teléfono" (PWA). En Android/Chrome dispara el prompt nativo de
 * instalación; en iOS (que no lo soporta) muestra las instrucciones de "Compartir → Agregar a inicio".
 * Se oculta solo si la app ya está instalada (modo standalone).
 */
export default function AddToWallet({ style, textMain, textMuted, accent }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOS, setShowIOS] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    // ¿Ya instalada / abierta como app?
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    if (standalone) { setInstalled(true); return }

    const ua = window.navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
    setIsIOS(ios)

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    const onInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // No renderizar si ya está instalada, o si no es iOS y el navegador no ofreció instalación
  if (!ready || installed) return null
  if (!isIOS && !deferred) return null

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else if (isIOS) {
      setShowIOS(v => !v)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl transition-all duration-200 hover:opacity-85 active:scale-[0.98]"
        style={style}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}22` }}>
          <Smartphone size={15} style={{ color: accent }} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-sans font-semibold text-sm" style={{ color: textMain }}>Agregá tu tarjeta al teléfono</div>
          <div className="font-sans text-xs" style={{ color: textMuted }}>Accedé a tus sellos con un toque, sin abrir el navegador</div>
        </div>
      </button>

      {showIOS && (
        <div className="mt-2 px-4 py-3 rounded-2xl font-sans text-xs leading-relaxed" style={{ ...style, color: textMuted }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold" style={{ color: textMain }}>En iPhone:</span>
            <button onClick={() => setShowIOS(false)}><X size={13} style={{ color: textMuted }} /></button>
          </div>
          <div className="flex items-center gap-1.5 mb-1"><Share size={12} /> 1. Tocá “Compartir” abajo</div>
          <div className="flex items-center gap-1.5"><Plus size={12} /> 2. Elegí “Agregar a inicio”</div>
        </div>
      )}
    </div>
  )
}
