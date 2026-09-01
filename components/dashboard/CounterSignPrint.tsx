'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Check, FoldVertical, Printer, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

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

type Format = 'tent' | 'flat'

function colorLuminance(color: string) {
  const normalized = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return 0
  const channels = [0, 2, 4].map(index => {
    const channel = parseInt(normalized.slice(index, index + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(first: string, second: string) {
  const [light, dark] = [colorLuminance(first), colorLuminance(second)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

function readableText(background: string) {
  return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#2B211C') ? '#FFFFFF' : '#2B211C'
}

function loyaltyWord(stampEnabled: boolean, pointsEnabled: boolean) {
  if (stampEnabled && !pointsEnabled) return 'sellos'
  if (pointsEnabled && !stampEnabled) return 'puntos'
  return 'beneficios'
}

/**
 * Lo que el dueño puede retocar antes de imprimir. NO se guarda: son ajustes de esta impresión.
 * Los colores y el logo permanentes viven en Configuración; acá se pueden pisar por si el color de
 * marca no rinde en papel, o si el café quiere otro texto para esta tanda de carteles.
 */
interface SignDraft {
  headline: string
  highlight: string
  subtext: string
  primaryColor: string
  accentColor: string
  showLogo: boolean
  /** Multiplicador del tamaño máximo del logo (1 = tamaño por defecto). */
  logoScale: number
}

function defaultDraft(cafe: Props['cafe']): SignDraft {
  return {
    headline: 'Escaneá y empezá a sumar',
    highlight: loyaltyWord(cafe.stampEnabled, cafe.pointsEnabled),
    subtext: 'Registrate con tu email.\nSin app. Sin tarjeta.',
    primaryColor: cafe.primaryColor,
    accentColor: cafe.accentColor,
    showLogo: !!cafe.logoUrl,
    logoScale: 1,
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/

function CafeIdentity({ cafe, showLogo, compact = false }: { cafe: Props['cafe']; showLogo: boolean; compact?: boolean }) {
  return (
    <div className={`cafe-identity ${compact ? 'cafe-identity--compact' : ''}`}>
      {cafe.logoUrl && showLogo && (
        <div className="cafe-logo-safe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cafe.logoUrl} alt={`Logo de ${cafe.name}`} className="cafe-logo" />
        </div>
      )}
      <div className="cafe-name">{cafe.name}</div>
    </div>
  )
}

function SipoCredit() {
  return (
    <div className="sipo-credit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" />
      <span>Con tecnología de <strong>Sipo</strong></span>
    </div>
  )
}

function CustomerMessage({ draft, url, compact = false }: { draft: SignDraft; url: string; compact?: boolean }) {
  return (
    <div className={`customer-message ${compact ? 'customer-message--compact' : ''}`}>
      <div className="qr-safe">
        <QRCodeSVG value={url} size={compact ? 184 : 310} fgColor="#2B211C" bgColor="#FFFFFF" level="M" marginSize={2} />
      </div>
      <div className="customer-copy">
        <div className="eyebrow">TU CAFÉ TAMBIÉN CUENTA</div>
        <h1>{draft.headline}{draft.highlight && <> <em>{draft.highlight}</em></>}</h1>
        <p>
          {draft.subtext.split('\n').map((linea, i) => (
            <span key={i}>{i > 0 && <br />}{linea}</span>
          ))}
        </p>
        <div className="scan-hint"><span aria-hidden="true">↗</span> Apuntá la cámara de tu celular al QR</div>
      </div>
    </div>
  )
}

function CashierFace({ cafe, draft }: { cafe: Props['cafe']; draft: SignDraft }) {
  return (
    <div className="cashier-face-inner">
      <CafeIdentity cafe={cafe} showLogo={draft.showLogo} compact />
      <div className="cashier-copy">
        <div className="eyebrow">ESTE LADO MIRA A LA CAJA</div>
        <h2>Ayudalos a dar el primer paso.</h2>
        <p>Invitá a tus clientes a escanear el cartel mientras esperan su pedido.</p>
        <div className="cashier-tip"><Check size={15} strokeWidth={2.5} /> El registro lleva menos de un minuto</div>
      </div>
      <SipoCredit />
    </div>
  )
}

function TentSheet({ cafe, draft, url }: { cafe: Props['cafe']; draft: SignDraft; url: string }) {
  return (
    <div className="print-sheet tent-sheet" aria-label="Cartel autoportante A4">
      <section className="tent-panel tent-cashier">
        <CashierFace cafe={cafe} draft={draft} />
      </section>
      <div className="fold-line"><span>PLEGAR</span></div>
      <section className="tent-panel tent-customer">
        <div className="tent-customer-inner">
          <CafeIdentity cafe={cafe} showLogo={draft.showLogo} compact />
          <CustomerMessage draft={draft} url={url} compact />
          <SipoCredit />
        </div>
      </section>
      <div className="fold-line"><span>PLEGAR</span></div>
      <section className="tent-base">
        <div className="assembly-guide">
          <FoldVertical size={18} />
          <div>
            <strong>Armado:</strong> marcá las tres líneas punteadas, plegá y pegá la pestaña por
            debajo del borde superior. <strong>No hay que recortar nada</strong>: la hoja se usa entera.
          </div>
        </div>
        <div className="base-mark">BASE · QUEDA APOYADA SOBRE EL MOSTRADOR</div>
      </section>
      <div className="fold-line"><span>PLEGAR</span></div>
      <section className="glue-tab"><span>APLICAR PEGAMENTO O CINTA DOBLE FAZ</span></section>
    </div>
  )
}

function FlatSheet({ cafe, draft, url }: { cafe: Props['cafe']; draft: SignDraft; url: string }) {
  return (
    <div className="print-sheet flat-sheet" aria-label="Cartel plano A4">
      <div className="flat-accent" />
      <div className="flat-content">
        <CafeIdentity cafe={cafe} showLogo={draft.showLogo} />
        <CustomerMessage draft={draft} url={url} />
        <SipoCredit />
      </div>
      <div className="stamp-motif" aria-hidden="true"><i /><i /><i /><i /></div>
    </div>
  )
}

export default function CounterSignPrint({ cafe, loyaltyUrl }: Props) {
  const [format, setFormat] = useState<Format>('tent')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SignDraft>(() => defaultDraft(cafe))
  const set = <K extends keyof SignDraft>(key: K, value: SignDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  const original = defaultDraft(cafe)
  const cambiado = (Object.keys(original) as (keyof SignDraft)[]).some(k => draft[k] !== original[k])

  // Los colores del borrador pasan por la misma matemática de contraste que los de marca: si el
  // dueño elige algo ilegible sobre el papel, el texto se corrige solo.
  const primary = HEX.test(draft.primaryColor) ? draft.primaryColor : cafe.primaryColor
  const accent = HEX.test(draft.accentColor) ? draft.accentColor : cafe.accentColor
  const primaryText = readableText(primary)
  const primaryOnLight = contrastRatio(primary, '#F8F3EC') >= 3
    ? primary
    : '#2B211C'
  const accentOnLight = contrastRatio(accent, '#F8F3EC') >= 3
    ? accent
    : primaryOnLight
  const accentOnPrimary = contrastRatio(primary, accent) >= 3
    ? accent
    : primaryText

  return (
    <div
      className="sign-workspace"
      style={{
        '--cafe-primary': primary,
        '--cafe-accent': accent,
        '--primary-on-light': primaryOnLight,
        '--accent-on-light': accentOnLight,
        '--accent-on-primary': accentOnPrimary,
        '--primary-text': primaryText,
        '--logo-scale': String(draft.logoScale),
      } as React.CSSProperties}
    >
      <header className="sign-toolbar">
        <div className="toolbar-top">
          <Link href={`/${cafe.slug}/admin/settings`} className="back-link"><ArrowLeft size={16} /> Volver a Configuración</Link>
          <div>
            <h1>Cartel para el mostrador</h1>
            <p>Elegí un formato, imprimilo en A4 al 100% y seguí las guías.</p>
          </div>
        </div>
        <div className="toolbar-actions">
          <div className="format-picker" role="group" aria-label="Formato del cartel">
            <button type="button" className={format === 'tent' ? 'active' : ''} onClick={() => setFormat('tent')}>
              Autoportante <span>plegar y pegar</span>
            </button>
            <button type="button" className={format === 'flat' ? 'active' : ''} onClick={() => setFormat('flat')}>
              Plano <span>para apoyar o enmarcar</span>
            </button>
          </div>
          <button
            type="button"
            className={`tweak-button ${editing ? 'active' : ''}`}
            onClick={() => setEditing(v => !v)}
            aria-expanded={editing}
          >
            <SlidersHorizontal size={15} /> Personalizar{cambiado && <span className="dot" aria-label="con cambios" />}
          </button>
          <button type="button" className="print-button" onClick={() => window.print()}><Printer size={17} /> Imprimir o guardar como PDF</button>
        </div>
        {editing && (
          <div className="tweak-panel">
            <div className="tweak-grid">
              <label>
                <span>Título</span>
                <input value={draft.headline} maxLength={60} onChange={e => set('headline', e.target.value)} />
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
                      <input
                        type="checkbox"
                        checked={draft.showLogo}
                        onChange={e => set('showLogo', e.target.checked)}
                      />
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
                  </div>
                </label>
              )}
            </div>
            <div className="tweak-foot">
              <p>
                Estos ajustes valen <strong>solo para esta impresión</strong> y no se guardan. Los
                colores y el logo del café se editan en{' '}
                <Link href={`/${cafe.slug}/admin/settings`}>Configuración</Link>.
              </p>
              <button type="button" onClick={() => setDraft(defaultDraft(cafe))} disabled={!cambiado}>
                <RotateCcw size={13} /> Restablecer
              </button>
            </div>
          </div>
        )}
        <p className="print-note">Para el autoportante recomendamos cartulina de 180–250 g. En el diálogo de impresión activá “gráficos de fondo”.</p>
        {!cafe.loyaltyEnabled && (
          <div className="loyalty-off">
            <AlertTriangle size={15} />
            <span>
              Tenés el programa de beneficios <strong>apagado</strong>. El cartel invita a sumar
              beneficios que hoy no se otorgan — activalo en Configuración antes de imprimirlo.
            </span>
          </div>
        )}
      </header>

      <main className="sheet-stage">
        {format === 'tent'
          ? <TentSheet cafe={cafe} draft={draft} url={loyaltyUrl} />
          : <FlatSheet cafe={cafe} draft={draft} url={loyaltyUrl} />}
      </main>

      <style jsx global>{`
        .sign-workspace { min-height: 100vh; background: #eee9e2; color: #43352c; }
        .sign-toolbar { position: sticky; top: 0; z-index: 20; padding: 18px 24px; background: rgba(252,251,248,.97); border-bottom: 1px solid #e5dacd; box-shadow: 0 8px 28px rgba(67,53,44,.08); }
        .toolbar-top, .toolbar-actions { max-width: 1040px; margin: 0 auto; display: flex; align-items: center; gap: 24px; }
        .toolbar-top { align-items: flex-start; }
        .toolbar-top > div { flex: 1; }
        .toolbar-top h1 { margin: 0; font: 600 25px/1.1 var(--font-serif); }
        .toolbar-top p, .print-note { margin: 4px 0 0; font: 12px/1.45 var(--font-sans); color: #746961; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; color: #6b5b50; font: 600 12px var(--font-sans); white-space: nowrap; }
        .toolbar-actions { justify-content: flex-end; margin-top: 14px; }
        .format-picker { display: flex; padding: 4px; border-radius: 13px; background: #f0e8df; }
        .format-picker button { min-width: 168px; padding: 8px 13px; border-radius: 10px; color: #756960; font: 700 12px/1.2 var(--font-sans); }
        .format-picker button span { display: block; margin-top: 2px; font-size: 9px; font-weight: 500; opacity: .75; }
        .format-picker button.active { background: white; color: #43352c; box-shadow: 0 2px 8px rgba(67,53,44,.1); }
        .print-button { display: inline-flex; align-items: center; gap: 8px; border-radius: 12px; padding: 12px 17px; color: white; background: #43352c; font: 700 12px var(--font-sans); }
        .print-note { max-width: 1040px; margin: 9px auto 0; text-align: right; }
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
        .tweak-check { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; color: #43352c; font: 500 12.5px var(--font-sans); }
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
        .sheet-stage { padding: 34px; overflow: auto; }
        .print-sheet { position: relative; width: 210mm; height: 297mm; margin: 0 auto; overflow: hidden; background: #f8f3ec; box-shadow: 0 12px 42px rgba(43,33,28,.18); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .cafe-identity { display: flex; flex-direction: column; align-items: center; gap: 5mm; text-align: center; }
        .cafe-identity--compact { flex-direction: row; gap: 4mm; text-align: left; }
        /* El logo conserva su propia proporción: se acota por lado máximo en vez de meterse en una
           caja fija, que descolocaba los cuadrados y los muy anchos. Sin marco ni sombra: cada logo
           trae su fondo y su forma, y decorarlo por encima es lo que lo hacía ver raro. */
        .cafe-logo-safe { display: flex; align-items: center; justify-content: center; }
        /* El logo se fija por ALTO y el ancho sale de su propia proporción, así la caja lo abraza en
           vez de encajarlo: un logo cuadrado y uno panorámico ocupan lo que les corresponde. El
           max-width evita que uno muy alargado se coma la hoja (ahí sí entra object-fit y sobra aire,
           pero sin deformarlo). Importa que el alto sea explícito: un SVG que solo trae viewBox no
           tiene tamaño intrínseco y con todo en auto colapsaría a cero. */
        .cafe-logo { display: block; height: calc(26mm * var(--logo-scale)); width: auto; max-width: calc(60mm * var(--logo-scale)); object-fit: contain; object-position: center; }
        .cafe-identity--compact .cafe-logo { height: calc(16mm * var(--logo-scale)); max-width: calc(46mm * var(--logo-scale)); }
        /* En la cara de la caja la identidad comparte una columna de 55mm con el nombre, asi que
           ahi el logo cede: sin este tope, uno panoramico empujaba el nombre fuera de la columna.
           El min() evita que subir el tamano desde el panel vuelva a romperlo. */
        .tent-cashier .cafe-logo { height: min(calc(13mm * var(--logo-scale)), 17mm); max-width: min(calc(20mm * var(--logo-scale)), 26mm); }
        /* Y si aun asi no entran en un renglon (nombre largo, logo panoramico), el nombre baja a la
           linea de abajo en vez de desbordar la columna. El piso de lo que puede achicarse es la
           palabra mas larga del nombre, asi que ningun tope fijo alcanza para todos los casos. */
        .tent-cashier .cafe-identity { flex-wrap: wrap; }
        .cafe-name { min-width: 0; }
        .cafe-name { max-width: 150mm; color: var(--primary-on-light); font: 600 13mm/.95 var(--font-serif); letter-spacing: -.035em; }
        .cafe-identity--compact .cafe-name { max-width: 115mm; font-size: 7.2mm; }
        .customer-message { display: flex; flex-direction: column; align-items: center; gap: 10mm; text-align: center; }
        .customer-message--compact { flex-direction: row; gap: 8mm; text-align: left; }
        .qr-safe { display: flex; flex: 0 0 auto; padding: 4mm; border: .5mm solid rgba(43,33,28,.14); border-radius: 5mm; background: #fff; box-shadow: 0 2mm 7mm rgba(43,33,28,.09); }
        .qr-safe svg { display: block; width: 82mm; height: 82mm; }
        .customer-message--compact .qr-safe { padding: 2.5mm; border-radius: 3mm; box-shadow: 0 1mm 3mm rgba(43,33,28,.08); }
        .customer-message--compact .qr-safe svg { width: 45mm; height: 45mm; }
        .customer-copy { flex: 1; }
        .eyebrow { margin-bottom: 2.5mm; color: var(--accent-on-light); font: 800 3.1mm/1.2 var(--font-sans); letter-spacing: .16em; }
        .customer-copy h1 { max-width: 165mm; margin: 0; color: #2b211c; font: 600 13mm/.95 var(--font-serif); letter-spacing: -.04em; }
        .customer-copy h1 em { color: var(--primary-on-light); font-style: italic; }
        .customer-copy p { margin: 5mm 0 0; color: #5f544d; font: 500 5mm/1.4 var(--font-sans); }
        .scan-hint { display: inline-flex; align-items: center; gap: 2mm; margin-top: 5mm; padding: 2.4mm 4mm; border-radius: 99mm; color: var(--primary-text); background: var(--cafe-primary); border: .3mm solid rgba(43,33,28,.15); font: 700 3.2mm var(--font-sans); }
        .scan-hint span { font-size: 4.2mm; }
        .customer-message--compact .customer-copy h1 { font-size: 8mm; max-width: 115mm; }
        .customer-message--compact .customer-copy p { margin-top: 2.5mm; font-size: 3.5mm; }
        .customer-message--compact .scan-hint { margin-top: 3mm; padding: 1.8mm 3mm; font-size: 2.5mm; }
        .sipo-credit { display: flex; align-items: center; justify-content: center; gap: 2mm; color: #887b71; font: 500 2.8mm var(--font-sans); }
        .sipo-credit img { width: 4.5mm; height: 4.5mm; }
        .sipo-credit strong { color: #43352c; }
        .tent-panel { position: relative; height: 95mm; padding: 9mm 12mm; }
        .tent-cashier { background: var(--cafe-primary); color: var(--primary-text); }
        .cashier-face-inner { height: 100%; display: grid; grid-template-columns: 55mm 1fr; grid-template-rows: 1fr auto; align-items: center; gap: 5mm 9mm; transform: rotate(180deg); }
        .tent-cashier .cafe-name { color: var(--primary-text); }
        .tent-cashier .cafe-logo-safe { padding: 1.5mm 2mm; border-radius: 2mm; background: #fff; }
        .cashier-copy .eyebrow { color: var(--accent-on-primary); opacity: .82; }
        .cashier-copy h2 { margin: 0; color: var(--primary-text); font: italic 600 8.5mm/.98 var(--font-serif); letter-spacing: -.03em; }
        .cashier-copy p { margin: 2.5mm 0 0; max-width: 105mm; color: var(--primary-text); opacity: .82; font: 500 3.4mm/1.45 var(--font-sans); }
        .cashier-tip { display: inline-flex; align-items: center; gap: 2mm; margin-top: 3mm; padding: 2mm 3mm; border: .3mm solid currentColor; border-radius: 99mm; color: var(--primary-text); font: 700 2.6mm var(--font-sans); }
        .tent-cashier .sipo-credit { grid-column: 1 / -1; color: var(--primary-text); opacity: .72; }
        .tent-cashier .sipo-credit strong { color: var(--primary-text); }
        .tent-customer { background: #f8f3ec; }
        .tent-customer-inner { height: 100%; display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto 1fr; gap: 4mm 8mm; align-items: center; }
        .tent-customer-inner > .cafe-identity { grid-column: 1 / -1; justify-self: center; }
        .tent-customer-inner > .customer-message { grid-column: 1 / -1; align-self: center; }
        .tent-customer-inner > .sipo-credit { display: none; }
        .fold-line { position: absolute; left: 0; z-index: 4; width: 100%; height: 0; border-top: .35mm dashed rgba(67,53,44,.48); }
        .fold-line span { position: absolute; right: 4mm; top: -2.5mm; padding: 0 1.4mm; color: #766a61; background: #f8f3ec; font: 700 2.2mm var(--font-sans); letter-spacing: .12em; }
        .tent-sheet > .fold-line:nth-of-type(1) { top: 95mm; }
        .tent-sheet > .fold-line:nth-of-type(2) { top: 190mm; }
        .tent-sheet > .fold-line:nth-of-type(3) { top: 279mm; }
        .tent-base { position: relative; height: 89mm; padding: 12mm 18mm; background: #eee5da; }
        .assembly-guide { display: flex; align-items: flex-start; gap: 4mm; max-width: 145mm; margin: 10mm auto 0; padding: 5mm; border: .35mm solid #cdbdaf; border-radius: 4mm; color: #5f544d; font: 500 3.3mm/1.5 var(--font-sans); }
        .assembly-guide svg { flex: 0 0 auto; margin-top: .5mm; }
        .base-mark { position: absolute; bottom: 7mm; left: 0; width: 100%; color: #9a8b80; text-align: center; font: 700 2.4mm var(--font-sans); letter-spacing: .14em; }
        .glue-tab { display: flex; align-items: center; justify-content: center; height: 18mm; color: #75685f; background: repeating-linear-gradient(135deg, #f8f3ec 0, #f8f3ec 3mm, #e9ded1 3mm, #e9ded1 4mm); font: 800 2.4mm var(--font-sans); letter-spacing: .13em; }
        .glue-tab span { padding: 1mm 2mm; background: #f8f3ec; }
        .flat-sheet { padding: 18mm; background: #f8f3ec; border: 4mm solid var(--primary-on-light); }
        .flat-accent { position: absolute; top: 0; left: 0; right: 0; height: 7mm; background: var(--cafe-primary); }
        .flat-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 8mm 0 4mm; }
        .flat-sheet .customer-message { margin-top: 2mm; }
        .stamp-motif { position: absolute; right: 9mm; bottom: 9mm; display: grid; grid-template-columns: repeat(2, 4mm); gap: 2mm; opacity: .5; }
        .stamp-motif i { width: 4mm; height: 4mm; border: .5mm solid var(--primary-on-light); border-radius: 50%; }
        .stamp-motif i:last-child { border: 0; background: var(--accent-on-light); }
        @media (max-width: 760px) {
          .sign-toolbar { position: static; padding: 16px; }
          .toolbar-top, .toolbar-actions { align-items: stretch; flex-direction: column; gap: 12px; }
          .toolbar-top > div { order: -1; }
          .format-picker { width: 100%; }
          .format-picker button { min-width: 0; flex: 1; }
          .print-button { justify-content: center; }
          .print-note { text-align: left; }
          .tweak-grid { grid-template-columns: 1fr; }
          .tweak-foot { flex-direction: column; align-items: stretch; }
          .sheet-stage { padding: 18px; }
        }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { width: 210mm; height: 297mm; margin: 0 !important; padding: 0 !important; background: white !important; }
          .sign-toolbar { display: none !important; }
          .sign-workspace, .sheet-stage { min-height: 0; margin: 0; padding: 0; background: white; overflow: visible; }
          .print-sheet { margin: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  )
}
