'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, Settings, Calendar, Infinity as InfinityIcon, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getEffectivePlan, planLabel } from '@/lib/planStatus'

interface Cafe {
  id: string
  slug: string
  name: string
  primaryColor: string
  planStatus: string
  isPermanent: boolean
  activeUntil: Date | string | null
  customerLimit: number
  owner: { name: string; email: string }
  _count: { customers: number; staff: number }
}

const toneCls: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  zinc: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
}

export default function SuperAdminCafeList({ cafes: initial, graceDays }: { cafes: Cafe[]; graceDays: number }) {
  const [cafes, setCafes] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)

  async function planAction(id: string, action: string, months?: number) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/cafe/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, months }),
      })
      if (res.ok) {
        const u = await res.json()
        setCafes(cs => cs.map(c => c.id === id
          ? { ...c, planStatus: u.planStatus, isPermanent: u.isPermanent, activeUntil: u.activeUntil }
          : c))
        toast.success('Plan actualizado')
      } else toast.error('Error al actualizar')
    } catch { toast.error('Error de conexión') }
    finally { setBusy(null) }
  }

  async function deleteCafe(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}" y todos sus datos? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/cafe/${id}`, { method: 'DELETE' })
    if (res.ok) { setCafes(cs => cs.filter(c => c.id !== id)); toast.success('Cafetería eliminada') }
    else toast.error('Error al eliminar')
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
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${toneCls[badge.tone]}`}>{badge.text}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  /{cafe.slug} · {cafe._count.customers} clientes · {cafe._count.staff} cajeros
                  {cafe.isPermanent
                    ? <span className="text-zinc-600"> · sin vencimiento</span>
                    : until && (plan === 'active' || plan === 'grace' || plan === 'expired')
                      ? <span className="text-zinc-600"> · vence {until}</span>
                      : plan === 'trial'
                        ? <span className="text-zinc-600"> · tope {cafe.customerLimit}</span>
                        : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/${cafe.slug}/admin`} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                  <Settings size={12} /> Panel
                </Link>
                <a href={`/${cafe.slug}`} target="_blank" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                  <ExternalLink size={12} /> Ver
                </a>
                <button onClick={() => deleteCafe(cafe.id, cafe.name)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Acciones de plan */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800/60">
              <span className="text-[11px] text-zinc-600 uppercase tracking-wider mr-1">Plan:</span>
              <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'activate_month', 1)} className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                <Calendar size={11} /> +1 mes
              </button>
              <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'activate_month', 3)} className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                <Calendar size={11} /> +3 meses
              </button>
              <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'activate_permanent')} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                <InfinityIcon size={11} /> Permanente
              </button>
              {(cafe.isPermanent || cafe.planStatus === 'active') && (
                <button disabled={busy === cafe.id} onClick={() => planAction(cafe.id, 'expire')} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 bg-zinc-800/60 hover:bg-red-500/10 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors">
                  <Clock size={11} /> Vencer
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
