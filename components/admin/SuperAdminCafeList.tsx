'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, Settings, Calendar, Infinity as InfinityIcon, Clock, ArrowDownToLine, RefreshCw, User, KeyRound, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getEffectivePlan, planLabel, tierLabel } from '@/lib/planStatus'
import { SELLABLE_TIERS, type PlanTier, type PlanTiers } from '@/lib/plans'

interface Cafe {
  id: string
  slug: string
  name: string
  primaryColor: string
  planStatus: string
  isPermanent: boolean
  activeUntil: Date | string | null
  planTier: string
  customerLimit: number
  mpPreapprovalId: string | null
  mpPreapprovalStatus: string | null
  mpLastChargeAt: Date | string | null
  mpLastChargeStatus: string | null
  planChangeRequestedTier: string | null
  owner: { name: string; email: string }
  _count: { customers: number; staff: number }
}

const toneCls: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  zinc: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
}

export default function SuperAdminCafeList({ cafes: initial, graceDays, tiers }: { cafes: Cafe[]; graceDays: number; tiers: PlanTiers }) {
  const [cafes, setCafes] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [tierChoice, setTierChoice] = useState<Record<string, PlanTier>>({})
  const [tempPassword, setTempPassword] = useState<{ cafeId: string; email: string; password: string } | null>(null)
  const [dateChoice, setDateChoice] = useState<Record<string, string>>({})
  // Borrar una cafetería es lo único acá que no se puede deshacer: en vez de un confirm() del
  // navegador (un Enter de distancia) hay un panel que lista lo que se pierde y pide escribir el
  // nombre exacto para habilitar el botón.
  const [deleting, setDeleting] = useState<{ cafeId: string; typed: string } | null>(null)

  function tierFor(cafe: Cafe): PlanTier {
    return tierChoice[cafe.id] ?? (SELLABLE_TIERS.includes(cafe.planTier as PlanTier) ? (cafe.planTier as PlanTier) : 'economico')
  }

  // Confirmaciones explícitas para las acciones que cortan servicio o plata. Antes eran un click
  // seco y no quedaba claro que además cancelan la suscripción de Mercado Pago.
  const CONFIRMS: Record<string, (c: Cafe) => string> = {
    set_trial: c =>
      `Pasar "${c.name}" al plan gratuito.\n\n` +
      `• El tope baja a ${tiers.free.customerLimit} clientes (los que ya tiene NO se borran).\n` +
      (c.mpPreapprovalId ? '• Se CANCELA su suscripción de Mercado Pago: deja de cobrársele.\n' : '') +
      '\n¿Seguimos?',
    expire: c =>
      `Marcar "${c.name}" como vencido.\n\n` +
      `• Entra en gracia por ${graceDays} días y después queda con el tope del plan gratuito.\n` +
      (c.mpPreapprovalId ? '• Se CANCELA su suscripción de Mercado Pago: deja de cobrársele.\n' : '') +
      '\n¿Seguimos?',
  }

  async function planAction(id: string, action: string, months?: number, planTier?: string, activeUntil?: string) {
    const cafe = cafes.find(c => c.id === id)
    if (cafe && CONFIRMS[action] && !confirm(CONFIRMS[action](cafe))) return
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/cafe/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, months, planTier, activeUntil }),
      })
      if (res.ok) {
        const u = await res.json()
        setCafes(cs => cs.map(c => c.id === id
          ? { ...c, planStatus: u.planStatus, isPermanent: u.isPermanent, activeUntil: u.activeUntil, planTier: u.planTier, customerLimit: u.customerLimit }
          : c))
        setDateChoice(d => { const next = { ...d }; delete next[id]; return next })
        toast.success('Plan actualizado')
      } else toast.error('Error al actualizar')
    } catch { toast.error('Error de conexión') }
    finally { setBusy(null) }
  }

  async function checkMpCharge(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/cafe/${id}/check-mp-charge`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al chequear'); return }
      toast(data.message, { icon: data.applied ? '✅' : 'ℹ️' })
      if (data.applied && data.cafe) {
        setCafes(cs => cs.map(c => c.id === id ? { ...c, ...data.cafe } : c))
      }
    } catch { toast.error('Error de conexión') }
    finally { setBusy(null) }
  }

  async function resetOwnerPassword(id: string, ownerName: string) {
    if (!confirm(`Generar una contraseña temporal para ${ownerName}?\n\nSu contraseña actual deja de funcionar al instante y va a tener que cambiarla en el próximo login.`)) return
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/cafe/${id}/reset-owner-password`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al resetear'); return }
      setTempPassword({ cafeId: id, email: data.email, password: data.tempPassword })
    } catch { toast.error('Error de conexión') }
    finally { setBusy(null) }
  }

  async function deleteCafe(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/cafe/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCafes(cs => cs.filter(c => c.id !== id))
        setDeleting(null)
        toast.success('Cafetería eliminada')
      } else {
        // El server puede negarse a borrar si Mercado Pago no aceptó cancelar la suscripción:
        // ese motivo hay que mostrarlo, no taparlo con un "Error al eliminar".
        toast.error(data.error || 'Error al eliminar')
      }
    } catch { toast.error('Error de conexión') }
    finally { setBusy(null) }
  }

  if (cafes.length === 0) {
    return <div className="bg-zinc-900 border border-zinc-800 rounded-xl text-center py-12 text-zinc-600 text-sm">No hay cafeterías registradas aún.</div>
  }

  return (
    <div className="space-y-3">
      {cafes.map(cafe => {
        const plan = getEffectivePlan(cafe, graceDays)
        const badge = planLabel(plan)
        const until = cafe.activeUntil ? new Date(cafe.activeUntil).toLocaleDateString('es-AR') : null
        return (
          <div key={cafe.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold" style={{ background: cafe.primaryColor }}>
                {cafe.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-white">{cafe.name}</span>
                  {/* Un café gratis en "prueba" mostraba DOS badges que decían lo mismo
                      ("Prueba" + "Gratis"). Ahora el tier es el badge principal y el estado de
                      pago solo aparece cuando agrega información real. */}
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-zinc-800/60 text-zinc-300 border-zinc-700">
                    {tierLabel(cafe.planTier)}
                  </span>
                  {!(cafe.planTier === 'free' && plan === 'trial') && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${toneCls[badge.tone]}`}>{badge.text}</span>
                  )}
                  {cafe.planChangeRequestedTier && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                      pidió pasar a {tierLabel(cafe.planChangeRequestedTier)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  /{cafe.slug} · {cafe._count.customers} clientes · {cafe._count.staff} cajeros
                  {cafe.planTier === 'grandfathered'
                    ? <span className="text-zinc-600"> · sin tope</span>
                    : <span className="text-zinc-600"> · tope {cafe.customerLimit}</span>}
                  {cafe.isPermanent
                    ? <span className="text-zinc-600"> · sin vencimiento</span>
                    : until && (plan === 'active' || plan === 'grace' || plan === 'expired')
                      ? <span className="text-zinc-600"> · {plan === 'expired' ? 'venció' : 'vence'} {until}</span>
                      : null}
                </div>
                {/* El dueño se consultaba de la DB y no se mostraba en ningún lado. */}
                <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                  <User size={11} className="text-zinc-600" />
                  {cafe.owner.name}
                  <a href={`mailto:${cafe.owner.email}`} className="text-zinc-500 hover:text-amber-400 transition-colors">
                    {cafe.owner.email}
                  </a>
                  <button
                    onClick={() => resetOwnerPassword(cafe.id, cafe.owner.name)}
                    disabled={busy === cafe.id}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-amber-400 disabled:opacity-50 transition-colors"
                    title="Genera una contraseña temporal si el dueño perdió el acceso"
                  >
                    <KeyRound size={10} /> Resetear clave
                  </button>
                </div>
                {tempPassword?.cafeId === cafe.id && (
                  <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[11px] text-amber-300 font-medium mb-1">
                      Contraseña temporal — copiala ahora, no se vuelve a mostrar:
                    </div>
                    <code className="block text-sm font-mono text-white bg-zinc-950 rounded px-2 py-1.5 select-all">
                      {tempPassword.password}
                    </code>
                    <div className="text-[11px] text-zinc-500 mt-1.5">
                      Para <span className="text-zinc-400">{tempPassword.email}</span> · tiene que cambiarla al entrar.
                    </div>
                    <button onClick={() => setTempPassword(null)} className="text-[11px] text-zinc-500 hover:text-zinc-300 underline mt-1.5">
                      Ya la guardé
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/${cafe.slug}/admin`} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                  <Settings size={12} /> Panel
                </Link>
                <a href={`/${cafe.slug}`} target="_blank" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                  <ExternalLink size={12} /> Ver
                </a>
                <button
                  onClick={() => setDeleting(d => d?.cafeId === cafe.id ? null : { cafeId: cafe.id, typed: '' })}
                  disabled={busy === cafe.id}
                  className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${deleting?.cafeId === cafe.id ? 'text-red-400 bg-red-400/10' : 'text-zinc-600 hover:text-red-400 hover:bg-red-400/10'}`}
                  title="Eliminar cafetería"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Confirmación de borrado — hay que escribir el nombre exacto para habilitarlo */}
            {deleting?.cafeId === cafe.id && (
              <div className="mt-3 p-4 rounded-lg bg-red-500/[0.07] border border-red-500/25">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-red-300">
                      Eliminar “{cafe.name}” para siempre
                    </div>
                    <div className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      Se borran <strong className="text-zinc-300">{cafe._count.customers} clientes</strong> de este
                      café (sellos, puntos e historial de compras),{' '}
                      <strong className="text-zinc-300">{cafe._count.staff} cajeros</strong>, sus premios, campañas,
                      difusiones y API keys. El dueño ({cafe.owner.email}) pierde el acceso.
                      {cafe.mpPreapprovalId && (
                        <> Primero se <strong className="text-zinc-300">cancela su suscripción de Mercado Pago</strong>;
                        si MP no la acepta, el borrado se frena.</>
                      )}
                      {' '}Las personas siguen existiendo a nivel plataforma (en Clientes), pero lo de este café no
                      se recupera.
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <label className="text-xs text-zinc-500">
                        Escribí <span className="font-mono text-zinc-300">{cafe.name}</span> para confirmar:
                      </label>
                      <input
                        autoFocus
                        value={deleting.typed}
                        onChange={e => setDeleting({ cafeId: cafe.id, typed: e.target.value })}
                        placeholder={cafe.name}
                        className="text-xs text-zinc-200 bg-zinc-950 px-2.5 py-1.5 rounded-md border border-zinc-700 outline-none focus:border-red-500/50 min-w-[180px]"
                      />
                      <button
                        disabled={busy === cafe.id || deleting.typed.trim() !== cafe.name.trim()}
                        onClick={() => deleteCafe(cafe.id)}
                        className="text-xs font-medium text-white bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors"
                      >
                        {busy === cafe.id ? 'Eliminando…' : 'Eliminar definitivamente'}
                      </button>
                      <button
                        disabled={busy === cafe.id}
                        onClick={() => setDeleting(null)}
                        className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-md transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones de plan */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800/60">
              <span className="text-[11px] text-zinc-600 uppercase tracking-wider mr-1">Plan:</span>
              <select
                disabled={busy === cafe.id}
                value={tierFor(cafe)}
                onChange={e => setTierChoice(t => ({ ...t, [cafe.id]: e.target.value as PlanTier }))}
                className="text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-2 py-1 rounded-md border border-zinc-700"
              >
                {SELLABLE_TIERS.map(t => (
                  <option key={t} value={t}>{tiers[t].label} · hasta {tiers[t].customerLimit}</option>
                ))}
              </select>
              <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'activate_month', 1, tierFor(cafe))} className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                <Calendar size={11} /> +1 mes
              </button>
              <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'activate_month', 3, tierFor(cafe))} className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                <Calendar size={11} /> +3 meses
              </button>
              <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'activate_permanent', undefined, tierFor(cafe))} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                <InfinityIcon size={11} /> Permanente
              </button>
              {(cafe.isPermanent || cafe.planStatus === 'active') && (
                <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'expire')} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 bg-zinc-800/60 hover:bg-red-500/10 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                  <Clock size={11} /> Vencer ahora
                </button>
              )}
              {/* Corregir la fecha a mano: los +1/+3 apilan, así que sin esto no se podía restar. */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  disabled={busy === cafe.id}
                  value={dateChoice[cafe.id] ?? (cafe.activeUntil ? new Date(cafe.activeUntil).toISOString().slice(0, 10) : '')}
                  onChange={e => setDateChoice(d => ({ ...d, [cafe.id]: e.target.value }))}
                  className="text-xs text-zinc-300 bg-zinc-800 disabled:opacity-50 px-2 py-1 rounded-md border border-zinc-700 [color-scheme:dark]"
                  title="Vencimiento del plan"
                />
                <button
                  disabled={busy === cafe.id || !dateChoice[cafe.id]}
                  onClick={() => planAction(cafe.id, 'set_active_until', undefined, undefined, dateChoice[cafe.id])}
                  className="text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 px-2.5 py-1 rounded-md transition-colors"
                >
                  Fijar fecha
                </button>
              </div>
              {cafe.planTier !== 'free' && cafe.planTier !== 'grandfathered' && (
                <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'set_trial')} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 bg-zinc-800/60 hover:bg-amber-500/10 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                  <ArrowDownToLine size={11} /> Bajar a gratis
                </button>
              )}
            </div>

            {/* Mercado Pago — solo si el café tiene una suscripción (cobro automático) */}
            {cafe.mpPreapprovalId && (
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-800/60">
                <span className="text-[11px] text-zinc-600 uppercase tracking-wider mr-1">Mercado Pago:</span>
                <span className="text-[11px] text-zinc-400">
                  {cafe.mpPreapprovalStatus ?? '—'}
                  {cafe.mpLastChargeStatus && (
                    <> · último cobro: {cafe.mpLastChargeStatus === 'approved' ? 'aprobado' : 'rechazado'}
                      {cafe.mpLastChargeAt && ` el ${new Date(cafe.mpLastChargeAt).toLocaleDateString('es-AR')}`}
                    </>
                  )}
                </span>
                <button
                  disabled={busy === cafe.id}
                  onClick={() => checkMpCharge(cafe.id)}
                  className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors ml-auto"
                >
                  <RefreshCw size={11} /> Chequear el cobro
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
