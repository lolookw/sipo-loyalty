'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CreditCard, ExternalLink } from 'lucide-react'
import { SELLABLE_TIERS, type PlanTiers } from '@/lib/plans'
import { tierLabel } from '@/lib/planStatus'

const inputStyle = { border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' } as React.CSSProperties
const MP_SUBSCRIPTIONS_URL = 'https://www.mercadopago.com.ar/subscriptions'

// Sección "Facturación" de Configuración (ver sipo-plan/04-mercado-pago/plan.md §8).
// Alta gratis→pago es self-service; cambiar entre tiers pagos se pide y lo aplica el equipo.
export default function BillingSection({
  cafeSlug, planTier, pendingSubscriptionTier, mpPreapprovalId, mpPreapprovalStatus,
  activeUntil, planChangeRequestedTier, mpSubscriptionAmount, pendingBillingSyncAt, tiers,
  mpPayerEmail, ownerEmail, primaryColor,
}: {
  cafeSlug: string
  planTier: string
  pendingSubscriptionTier: string | null
  mpPreapprovalId: string | null
  mpPreapprovalStatus: string | null
  activeUntil: string | null
  planChangeRequestedTier: string | null
  mpSubscriptionAmount: number | null
  pendingBillingSyncAt: string | null
  tiers: PlanTiers
  mpPayerEmail: string | null
  ownerEmail: string | null
  primaryColor: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [requestTier, setRequestTier] = useState('')
  // MP valida que quien autoriza el pago entre con la cuenta de ESTE email. Como no tiene por qué
  // ser el mismo con el que entra a Sipo, se pide y confirma antes de mandarlo a Mercado Pago.
  const [confirmingTier, setConfirmingTier] = useState<string | null>(null)
  const [payerEmail, setPayerEmail] = useState(mpPayerEmail ?? ownerEmail ?? '')

  async function subscribe(tier: string) {
    setBusy(tier)
    try {
      const res = await fetch(`/api/cafe/${cafeSlug}/billing/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, payerEmail }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'No pudimos iniciar la suscripción'); return }
      window.location.href = data.initPoint
    } catch { toast.error('Error de conexión') }
    finally { setBusy(null) }
  }

  async function cancel() {
    const until = activeUntil ? new Date(activeUntil).toLocaleDateString('es-AR') : null
    // El mismo endpoint sirve para dos casos muy distintos: cancelar un plan que está andando, o
    // descartar un alta que quedó a medio pagar. El aviso tiene que decir lo que corresponde.
    const ok = pendingSubscriptionTier
      ? confirm('Se descarta el intento de suscripción y volvés a poder elegir un plan.\n\nSi en realidad el pago se llegó a procesar, escribinos antes de reintentar.')
      : confirm(
          'Se corta el cobro automático de tu plan.\n\n' +
          (until ? `Tu plan sigue funcionando normalmente hasta el ${until} (ya está pago). ` : '') +
          'Después de esa fecha tu cafetería vuelve al plan gratuito.',
        )
    if (!ok) return
    setBusy('cancel')
    try {
      const res = await fetch(`/api/cafe/${cafeSlug}/billing/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'No pudimos cancelar'); return }
      toast.success('Cobro automático cancelado')
      router.refresh()
    } catch { toast.error('Error de conexión') }
    finally { setBusy(null) }
  }

  async function requestChange() {
    if (!requestTier) return
    setBusy('request')
    try {
      const res = await fetch(`/api/cafe/${cafeSlug}/billing/request-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: requestTier }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'No pudimos registrar el pedido'); return }
      toast.success('Pedido enviado — te vamos a contactar para coordinarlo')
      setRequestTier('')
      router.refresh()
    } catch { toast.error('Error de conexión') }
    finally { setBusy(null) }
  }

  if (planTier === 'grandfathered') {
    return (
      <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: '1px solid #E9DED1' }}>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          Tu plan lo gestiona el equipo de Sipo directamente.
        </p>
      </div>
    )
  }

  // Alta iniciada pero todavía sin el primer cobro confirmado (ver plan §5A: el tier NO sube
  // hasta que llega el webhook de pago aprobado, puede tardar).
  if (pendingSubscriptionTier) {
    return (
      <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: `1.5px solid ${primaryColor}` }}>
        <p className="font-sans text-sm font-semibold mb-1" style={{ color: '#43352C' }}>
          Confirmando tu suscripción a {tierLabel(pendingSubscriptionTier)}…
        </p>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          Si ya autorizaste el pago en Mercado Pago, puede tardar unos minutos en acreditarse.
          Refrescá esta página en un rato.
        </p>
        {/* Salida para el que abandonó el pago a mitad de camino: sin esto quedaba trabado acá
            sin poder reintentar (el cron lo limpia solo, pero recién a las 24h). */}
        <button
          onClick={cancel}
          disabled={busy !== null}
          className="font-sans text-xs underline mt-3 disabled:opacity-40"
          style={{ color: '#9B9089' }}
        >
          {busy === 'cancel' ? 'Cancelando…' : '¿No completaste el pago? Cancelá el intento para volver a empezar'}
        </button>
      </div>
    )
  }

  // Paso previo al redirect: confirmar con qué cuenta de Mercado Pago se va a pagar. Sin esto,
  // si el email de MP no es el mismo que el de Sipo, MP rechaza con "tu email no coincide con el
  // de la suscripción" recién al final, después de que el dueño ya se fue del sitio.
  if (confirmingTier) {
    const t = tiers[confirmingTier as keyof PlanTiers]
    return (
      <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: `1.5px solid ${primaryColor}` }}>
        <p className="font-sans text-sm font-semibold mb-1" style={{ color: '#43352C' }}>
          Plan {t.label} · ${t.price?.toLocaleString('es-AR')}/mes
        </p>
        <p className="font-sans text-sm mb-3" style={{ color: '#6B6B6B' }}>
          Confirmá el email de <strong>tu cuenta de Mercado Pago</strong>. Tiene que ser esa misma
          cuenta la que autorice el pago — si usás otro mail en Mercado Pago que acá, cambialo abajo.
        </p>
        <input
          type="email"
          value={payerEmail}
          onChange={e => setPayerEmail(e.target.value)}
          placeholder="tucuenta@mercadopago.com"
          className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm mb-3"
          style={inputStyle}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => subscribe(confirmingTier)}
            disabled={busy !== null || !payerEmail.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
            style={{ background: primaryColor }}
          >
            <CreditCard size={14} />
            {busy === confirmingTier ? 'Redirigiendo…' : 'Ir a Mercado Pago'}
          </button>
          <button
            onClick={() => setConfirmingTier(null)}
            disabled={busy !== null}
            className="px-4 py-2.5 rounded-xl font-sans text-sm transition-colors disabled:opacity-40"
            style={{ border: '1px solid #E9DED1', color: '#6B6B6B', background: 'white' }}
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  // Plan gratis: mostrar los tiers para contratar.
  if (planTier === 'free') {
    return (
      <div>
        <p className="font-sans text-sm mb-4" style={{ color: '#6B6B6B' }}>
          Estás en el plan gratis. Mejorá tu plan para sumar más clientes.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {SELLABLE_TIERS.map(tier => {
            const { label, price, customerLimit } = tiers[tier]
            return (
              <div key={tier} className="p-4 rounded-xl flex flex-col gap-3" style={inputStyle}>
                <div>
                  <div className="font-sans font-semibold text-sm" style={{ color: '#43352C' }}>{label}</div>
                  <div className="font-sans text-xs" style={{ color: '#9B9089' }}>Hasta {customerLimit} clientes</div>
                  <div className="font-sans text-lg font-semibold mt-1" style={{ color: '#43352C' }}>
                    ${price?.toLocaleString('es-AR')}<span className="text-xs font-normal" style={{ color: '#9B9089' }}>/mes</span>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmingTier(tier)}
                  disabled={busy !== null}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                  style={{ background: primaryColor }}
                >
                  <CreditCard size={14} />
                  Mejorar plan
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Plan pago. Con suscripción de MP → self-service; sin ella (activado a mano) → solo informativo.
  const hasSubscription = mpPreapprovalId !== null && mpPreapprovalStatus !== 'cancelled'
  const until = activeUntil ? new Date(activeUntil).toLocaleDateString('es-AR') : null
  const otherTiers = SELLABLE_TIERS.filter(t => t !== planTier)

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: '1px solid #E9DED1' }}>
        <p className="font-sans text-sm font-semibold mb-1" style={{ color: '#43352C' }}>
          Plan actual: {tierLabel(planTier)}
          <span className="font-normal" style={{ color: '#9B9089' }}>
            {' '}· hasta {tiers[planTier as keyof PlanTiers]?.customerLimit} clientes
          </span>
        </p>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          {hasSubscription
            ? until
              ? `Próximo cobro: ${until}${mpSubscriptionAmount ? ` · $${mpSubscriptionAmount.toLocaleString('es-AR')}` : ''}.`
              : 'Cobro automático activo.'
            : mpPreapprovalStatus === 'cancelled'
              ? until ? `Cobro automático cancelado — tu plan sigue activo hasta el ${until}.` : 'Cobro automático cancelado.'
              : 'Tu plan lo gestiona el equipo de Sipo directamente. Podés dejar tu medio de pago para que se renueve solo.'}
        </p>
        {hasSubscription && pendingBillingSyncAt && (
          <p className="font-sans text-xs mt-2" style={{ color: '#B56A4C' }}>
            El precio de tu plan cambia a partir del {new Date(pendingBillingSyncAt).toLocaleDateString('es-AR')} —
            te mandamos un mail con el detalle.
          </p>
        )}
      </div>

      {!hasSubscription && (
        <button
          onClick={() => setConfirmingTier(planTier)}
          disabled={busy !== null}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          style={{ background: primaryColor }}
        >
          <CreditCard size={14} />
          Activar cobro automático
        </button>
      )}

      {hasSubscription && (
        <div className="flex flex-wrap gap-2">
          <a
            href={MP_SUBSCRIPTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-sans text-xs font-medium transition-colors"
            style={{ border: '1px solid #E9DED1', color: '#43352C', background: 'white' }}
          >
            <ExternalLink size={13} /> Gestionar método de pago
          </a>
          <button
            onClick={cancel}
            disabled={busy !== null}
            className="px-4 py-2.5 rounded-xl font-sans text-xs font-medium transition-colors disabled:opacity-40"
            style={{ border: '1px solid #E9DED1', color: '#f87171', background: 'white' }}
          >
            {busy === 'cancel' ? 'Cancelando…' : 'Cancelar suscripción'}
          </button>
        </div>
      )}

      {/* Cambio de tier: se pide, lo aplica el equipo (ver plan §5F) */}
      {planChangeRequestedTier ? (
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          Pediste cambiar al plan <strong>{tierLabel(planChangeRequestedTier)}</strong> — te vamos a
          contactar para coordinarlo.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-xs" style={{ color: '#9B9089' }}>¿Querés otro plan?</span>
          <select
            value={requestTier}
            onChange={e => setRequestTier(e.target.value)}
            className="px-3 py-2 rounded-xl font-sans text-xs outline-none"
            style={inputStyle}
          >
            <option value="">Elegí un plan…</option>
            {otherTiers.map(t => (
              <option key={t} value={t}>{tiers[t].label} · hasta {tiers[t].customerLimit} · ${tiers[t].price?.toLocaleString('es-AR')}/mes</option>
            ))}
          </select>
          <button
            onClick={requestChange}
            disabled={busy !== null || !requestTier}
            className="px-4 py-2 rounded-xl font-sans text-xs font-medium transition-colors disabled:opacity-40"
            style={{ border: '1px solid #E9DED1', color: '#43352C', background: 'white' }}
          >
            {busy === 'request' ? 'Enviando…' : 'Solicitar cambio de plan'}
          </button>
        </div>
      )}
    </div>
  )
}
