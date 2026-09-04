'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowLeft, Check, Download, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { HEX_COLOR, contrastRatio, loyaltyWord, readableText } from '@/lib/brandContrast'

interface Props {
  cafe: {
    slug: string
    name: string
    logoUrl: string | null
    primaryColor: string
    accentColor: string
    stampEnabled: boolean
    pointsEnabled: boolean
    loyaltyEnabled: boolean
  }
  /** URL que codifica el QR, resuelta en el servidor con el dominio canónico. */
  loyaltyUrl: string
}

type Format = 'story' | 'portrait' | 'square'

/**
 * Instagram recomienda 1080px de ancho para las tres piezas: dejando el ancho fijo, lo único que
 * cambia entre formatos es el alto y algunas medidas internas (QR, tipografía) para que cada uno
 * respire distinto en vez de verse como el mismo diseño recortado.
 */
const FORMATS: Record<Format, {
  label: string; ratio: string; width: number; height: number
  padY: number; padX: number; qr: number; nameSize: number; headlineSize: number; subtextSize: number; logoH: number
}> = {
  story:    { label: 'Story',        ratio: '9:16', width: 1080, height: 1920, padY: 150, padX: 100, qr: 380, nameSize: 42, headlineSize: 78, subtextSize: 33, logoH: 100 },
  portrait: { label: 'Feed vertical', ratio: '4:5',  width: 1080, height: 1350, padY: 96,  padX: 100, qr: 300, nameSize: 38, headlineSize: 62, subtextSize: 29, logoH: 84 },
  square:   { label: 'Feed cuadrado', ratio: '1:1',  width: 1080, height: 1080, padY: 76,  padX: 96,  qr: 250, nameSize: 34, headlineSize: 52, subtextSize: 26, logoH: 72 },
}

/**
 * Lo que el dueño puede retocar antes de descargar. NO se guarda: son ajustes de esta pieza,
 * igual que en el cartel de mostrador (ver CounterSignPrint) — de ahí sale el mismo patrón.
 */
interface AssetDraft {
  headline: string
  highlight: string
  subtext: string
  primaryColor: string
  accentColor: string
  showLogo: boolean
  logoScale: number
  logoRounded: boolean
}

function defaultDraft(cafe: Props['cafe']): AssetDraft {
  return {
    headline: 'Ahora sumás',
    highlight: loyaltyWord(cafe.stampEnabled, cafe.pointsEnabled),
    subtext: 'Escaneá el código y sumate.\nSin app. Sin tarjeta.',
    primaryColor: cafe.primaryColor,
    accentColor: cafe.accentColor,
    showLogo: !!cafe.logoUrl,
    logoScale: 1,
    logoRounded: false,
  }
}

export default function SocialAssetsExport({ cafe, loyaltyUrl }: Props) {
  const [format, setFormat] = useState<Format>('story')
  const [editing, setEditing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [draft, setDraft] = useState<AssetDraft>(() => defaultDraft(cafe))
  const canvasRef = useRef<HTMLDivElement>(null)

  const set = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  const original = defaultDraft(cafe)
  const cambiado = (Object.keys(original) as (keyof AssetDraft)[]).some(k => draft[k] !== original[k])

  // Misma matemática de contraste que el cartel: si el color elegido no rinde sobre el fondo, el
  // texto se corrige solo.
  const primary = HEX_COLOR.test(draft.primaryColor) ? draft.primaryColor : cafe.primaryColor
  const accent = HEX_COLOR.test(draft.accentColor) ? draft.accentColor : cafe.accentColor
  const primaryText = readableText(primary)
  const accentOnPrimary = contrastRatio(primary, accent) >= 3 ? accent : primaryText

  const spec = FORMATS[format]
  // Escala solo de pantalla: el nodo que se captura queda siempre a resolución nativa (1080px de
  // ancho), acá únicamente se lo achica visualmente para que entre en la pantalla del dueño.
  const previewScale = Math.min(1, 420 / spec.width)

  async function handleDownload() {
    if (!canvasRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(canvasRef.current, {
        width: spec.width,
        height: spec.height,
        pixelRatio: 1,
        cacheBust: true,
        skipFonts: true,
      })
      const link = document.createElement('a')
      link.download = `sipo-${cafe.slug}-${format}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error exportando pieza para redes:', err)
      toast.error('No se pudo generar la imagen. Probá de nuevo.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="social-workspace"
      style={{
        '--cafe-primary': primary,
        '--cafe-accent': accent,
        '--primary-text': primaryText,
        '--accent-on-primary': accentOnPrimary,
        '--logo-scale': String(draft.logoScale),
      } as React.CSSProperties}
    >
      <header className="social-toolbar">
        <div className="toolbar-top">
          <Link href={`/${cafe.slug}/admin/compartir`} className="back-link"><ArrowLeft size={16} /> Volver a Compartir mi café</Link>
          <div>
            <h1>Piezas para Instagram</h1>
            <p>Elegí un formato, personalizalo si querés y descargá el PNG listo para publicar.</p>
          </div>
        </div>
        <div className="toolbar-actions">
          <div className="format-picker" role="group" aria-label="Formato de la pieza">
            {(Object.keys(FORMATS) as Format[]).map(key => (
              <button
                key={key}
                type="button"
                className={format === key ? 'active' : ''}
                onClick={() => setFormat(key)}
              >
                {FORMATS[key].label} <span>{FORMATS[key].ratio}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`tweak-button ${editing ? 'active' : ''}`}
            onClick={() => setEditing(v => !v)}
            aria-expanded={editing}
          >
            <SlidersHorizontal size={15} /> Personalizar{cambiado && <span className="dot" aria-label="con cambios" />}
          </button>
          <button type="button" className="download-button" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 size={17} className="spin" /> : <Download size={17} />}
            {downloading ? 'Generando…' : 'Descargar PNG'}
          </button>
        </div>
        {editing && (
          <div className="tweak-panel">
            <div className="tweak-grid">
              <label>
                <span>Título</span>
                <input value={draft.headline} maxLength={40} onChange={e => set('headline', e.target.value)} />
              </label>
              <label>
                <span>Palabra destacada</span>
                <input value={draft.highlight} maxLength={24} onChange={e => set('highlight', e.target.value)} />
              </label>
              <label className="tweak-wide">
                <span>Bajada <em>(un renglón por línea)</em></span>
                <textarea rows={2} value={draft.subtext} maxLength={120} onChange={e => set('subtext', e.target.value)} />
              </label>
              <label className="tweak-color">
                <span>Color principal</span>
                <input type="color" value={primary} onChange={e => set('primaryColor', e.target.value)} />
              </label>
              <label className="tweak-color">
                <span>Color de acento</span>
                <input type="color" value={accent} onChange={e => set('accentColor', e.target.value)} />
              </label>
              {cafe.logoUrl && (
                <label className="tweak-wide tweak-logo">
                  <span>Logo</span>
                  <div>
                    <label className="tweak-check">
                      <input type="checkbox" checked={draft.showLogo} onChange={e => set('showLogo', e.target.checked)} />
                      Mostrarlo
                    </label>
                    <input
                      type="range" min={0.6} max={1.8} step={0.05}
                      value={draft.logoScale}
                      disabled={!draft.showLogo}
                      onChange={e => set('logoScale', Number(e.target.value))}
                      aria-label="Tamaño del logo"
                    />
                    <output>{Math.round(draft.logoScale * 100)}%</output>
                    <label className="tweak-check">
                      <input
                        type="checkbox"
                        checked={draft.logoRounded}
                        disabled={!draft.showLogo}
                        onChange={e => set('logoRounded', e.target.checked)}
                      />
                      Recortar en círculo
                    </label>
                  </div>
                </label>
              )}
            </div>
            <div className="tweak-foot">
              <p>
                Estos ajustes valen <strong>solo para esta pieza</strong> y no se guardan. Los
                colores y el logo del café se editan en{' '}
                <Link href={`/${cafe.slug}/admin/settings`}>Configuración</Link>.
              </p>
              <button type="button" onClick={() => setDraft(defaultDraft(cafe))} disabled={!cambiado}>
                <RotateCcw size={13} /> Restablecer
              </button>
            </div>
          </div>
        )}
        {!cafe.loyaltyEnabled && (
          <div className="loyalty-off">
            <AlertTriangle size={15} />
            <span>
              Tenés el programa de beneficios <strong>apagado</strong>. La pieza invita a sumar
              beneficios que hoy no se otorgan — activalo en Configuración antes de publicarla.
            </span>
          </div>
        )}
      </header>

      <main className="canvas-stage">
        {/*
          Dos capas separadas a propósito: la escala de pantalla vive en un envoltorio (para que
          el dueño vea la pieza entera sin scroll), y el nodo que capturamos (canvasRef) queda SIN
          transform propio, a su tamaño nativo de 1080px. html-to-image clona solo el subárbol del
          nodo referenciado — si el scale estuviera en ese mismo nodo, la descarga saldría
          encogida dentro del lienzo en vez de llenarlo.
        */}
        <div className="canvas-frame" style={{ width: spec.width * previewScale, height: spec.height * previewScale }}>
          <div className="canvas-scaler" style={{ width: spec.width, height: spec.height, transform: `scale(${previewScale})` }}>
            <div
              ref={canvasRef}
              className="social-canvas"
              style={{
                width: spec.width, height: spec.height,
                padding: `${spec.padY}px ${spec.padX}px`,
              }}
            >
              <div className="canvas-top">
                {cafe.logoUrl && draft.showLogo && (
                  <div className={`social-logo-safe ${draft.logoRounded ? 'social-logo-safe--round' : ''}`} style={{ height: spec.logoH }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cafe.logoUrl}
                      alt=""
                      className={`social-logo ${draft.logoRounded ? 'social-logo--round' : ''}`}
                    />
                  </div>
                )}
                <div className="social-name" style={{ fontSize: spec.nameSize }}>{cafe.name}</div>
              </div>

              <div className="canvas-middle">
                <div className="social-eyebrow">YA ACEPTAMOS SIPO</div>
                <h1 className="social-headline" style={{ fontSize: spec.headlineSize }}>
                  {draft.headline}{draft.highlight && <> <em>{draft.highlight}</em></>}
                </h1>
                <p className="social-subtext" style={{ fontSize: spec.subtextSize }}>
                  {draft.subtext.split('\n').map((linea, i) => (
                    <span key={i}>{i > 0 && <br />}{linea}</span>
                  ))}
                </p>
              </div>

              <div className="canvas-bottom">
                <div className="qr-card" style={{ width: spec.qr + 48 }}>
                  <QRCodeSVG value={loyaltyUrl} size={spec.qr} fgColor="#2B211C" bgColor="#FFFFFF" level="M" marginSize={0} />
                  <div className="qr-caption"><Check size={16} strokeWidth={3} /> Escaneá para sumarte</div>
                </div>
                <div className="social-credit">Con tecnología de <strong>Sipo</strong></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .social-workspace { min-height: 100vh; background: #eee9e2; color: #43352c; }
        .social-toolbar { position: sticky; top: 0; z-index: 20; padding: 18px 24px; background: rgba(252,251,248,.97); border-bottom: 1px solid #e5dacd; box-shadow: 0 8px 28px rgba(67,53,44,.08); }
        .toolbar-top, .toolbar-actions { max-width: 1040px; margin: 0 auto; display: flex; align-items: center; gap: 24px; }
        .toolbar-top { align-items: flex-start; }
        .toolbar-top > div { flex: 1; }
        .toolbar-top h1 { margin: 0; font: 600 25px/1.1 var(--font-serif); }
        .toolbar-top p { margin: 4px 0 0; font: 12px/1.45 var(--font-sans); color: #746961; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; color: #6b5b50; font: 600 12px var(--font-sans); white-space: nowrap; }
        .toolbar-actions { justify-content: flex-end; margin-top: 14px; flex-wrap: wrap; }
        .format-picker { display: flex; padding: 4px; border-radius: 13px; background: #f0e8df; }
        .format-picker button { min-width: 140px; padding: 8px 13px; border-radius: 10px; color: #756960; font: 700 12px/1.2 var(--font-sans); }
        .format-picker button span { display: block; margin-top: 2px; font-size: 9px; font-weight: 500; opacity: .75; }
        .format-picker button.active { background: white; color: #43352c; box-shadow: 0 2px 8px rgba(67,53,44,.1); }
        .download-button { display: inline-flex; align-items: center; gap: 8px; border-radius: 12px; padding: 12px 17px; color: white; background: #43352c; font: 700 12px var(--font-sans); }
        .download-button:disabled { opacity: .6; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tweak-button { display: inline-flex; align-items: center; gap: 7px; border-radius: 12px; padding: 12px 15px; color: #5f544d; background: #f0e8df; font: 700 12px var(--font-sans); }
        .tweak-button.active { color: #43352c; background: #e3d6c8; }
        .tweak-button .dot { width: 6px; height: 6px; border-radius: 50%; background: #b98a2e; }
        .tweak-panel { max-width: 1040px; margin: 14px auto 0; padding: 15px; border-radius: 14px; background: #f8f3ec; border: 1px solid #e5dacd; }
        .tweak-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .tweak-grid label { display: flex; flex-direction: column; gap: 5px; }
        .tweak-grid label > span { color: #6b5b50; font: 700 10px var(--font-sans); letter-spacing: .07em; text-transform: uppercase; }
        .tweak-grid label > span em { font-style: normal; font-weight: 500; text-transform: none; letter-spacing: 0; opacity: .75; }
        .tweak-grid input[type=text], .tweak-grid input:not([type]), .tweak-grid textarea { width: 100%; padding: 9px 11px; border: 1px solid #e0d3c4; border-radius: 10px; background: white; color: #43352c; font: 500 13px/1.4 var(--font-sans); resize: vertical; }
        .tweak-wide { grid-column: 1 / -1; }
        .tweak-color input[type=color] { width: 54px; height: 34px; padding: 0; border: 1px solid #e0d3c4; border-radius: 9px; background: white; cursor: pointer; }
        .tweak-logo > div { display: flex; align-items: center; gap: 14px; }
        .tweak-grid .tweak-check { display: inline-flex; flex-direction: row; align-items: center; gap: 6px; flex: 0 0 auto; color: #43352c; font: 500 12.5px var(--font-sans); }
        .tweak-check input { width: 15px; height: 15px; accent-color: #43352c; }
        .tweak-logo input[type=range] { flex: 1; min-width: 120px; accent-color: #43352c; }
        .tweak-logo input[type=range]:disabled { opacity: .4; }
        .tweak-logo output { flex: 0 0 auto; min-width: 40px; color: #746961; font: 600 12px var(--font-sans); text-align: right; }
        .tweak-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 13px; padding-top: 12px; border-top: 1px solid #e5dacd; }
        .tweak-foot p { margin: 0; color: #746961; font: 500 11.5px/1.45 var(--font-sans); }
        .tweak-foot a { color: #43352c; text-decoration: underline; }
        .tweak-foot button { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; padding: 8px 12px; border-radius: 10px; color: #5f544d; background: #ece3d8; font: 700 11.5px var(--font-sans); }
        .tweak-foot button:disabled { opacity: .45; cursor: default; }
        .loyalty-off { display: flex; align-items: flex-start; gap: 8px; max-width: 1040px; margin: 12px auto 0; padding: 10px 13px; border-radius: 11px; color: #7a6034; background: #fdf6ec; border: 1px solid #ebd9be; font: 500 12px/1.45 var(--font-sans); }
        .loyalty-off svg { flex: 0 0 auto; margin-top: 1px; }

        .canvas-stage { display: flex; justify-content: center; padding: 34px; overflow: auto; }
        .canvas-frame { position: relative; overflow: hidden; border-radius: 18px; box-shadow: 0 12px 42px rgba(43,33,28,.22); }
        .canvas-scaler { transform-origin: top left; }
        .social-canvas { display: flex; flex-direction: column; justify-content: space-between; background: var(--cafe-primary); box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .canvas-top { display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
        .social-logo-safe { display: flex; align-items: center; justify-content: center; padding: 0 6px; border-radius: 16px; background: rgba(255,255,255,.94); }
        .social-logo { display: block; height: calc(100% * var(--logo-scale)); width: auto; max-width: 100%; object-fit: contain; }
        .social-logo--round { aspect-ratio: 1; width: auto; border-radius: 50%; }
        .social-logo-safe--round { border-radius: 50%; padding: 10px; }
        .social-name { color: var(--primary-text); font: 600 1em/1.05 var(--font-serif); letter-spacing: -.02em; }
        .canvas-middle { display: flex; flex-direction: column; align-items: center; gap: 22px; text-align: center; }
        .social-eyebrow { padding: 8px 18px; border-radius: 99px; border: 1.5px solid var(--accent-on-primary); color: var(--accent-on-primary); font: 800 22px/1 var(--font-sans); letter-spacing: .14em; }
        .social-headline { max-width: 900px; margin: 0; color: var(--primary-text); font: 600 1em/1.03 var(--font-serif); letter-spacing: -.03em; }
        .social-headline em { color: var(--accent-on-primary); font-style: italic; }
        .social-subtext { max-width: 760px; margin: 0; color: var(--primary-text); opacity: .82; font: 500 1em/1.4 var(--font-sans); }
        .canvas-bottom { display: flex; flex-direction: column; align-items: center; gap: 28px; }
        .qr-card { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px; border-radius: 24px; background: #fff; box-shadow: 0 16px 40px rgba(0,0,0,.18); }
        .qr-caption { display: inline-flex; align-items: center; gap: 8px; color: #2b211c; font: 700 24px var(--font-sans); }
        .social-credit { color: var(--primary-text); opacity: .72; font: 500 24px var(--font-sans); }
        .social-credit strong { opacity: 1; }

        @media (max-width: 760px) {
          .social-toolbar { position: static; padding: 16px; }
          .toolbar-top, .toolbar-actions { align-items: stretch; flex-direction: column; gap: 12px; }
          .toolbar-top > div { order: -1; }
          .format-picker { width: 100%; }
          .format-picker button { min-width: 0; flex: 1; }
          .download-button { justify-content: center; }
          .tweak-grid { grid-template-columns: 1fr; }
          .tweak-foot { flex-direction: column; align-items: stretch; }
          .canvas-stage { padding: 18px; }
        }
      `}</style>
    </div>
  )
}
