'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { EDITABLE_TIERS, type PlanTier, type PlanTiers } from '@/lib/plans'

const inputCls =
  'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/50 transition-colors'

// Precio y tope de cada plan. Editable en caliente: no hace falta deploy para cambiar precios.
export default function PlanTiersForm({ tiers: initial }: { tiers: PlanTiers }) {
  const [tiers, setTiers] = useState(initial)
  const [saving, setSaving] = useState<PlanTier | null>(null)

  function set(tier: PlanTier, key: 'price' | 'customerLimit', value: number) {
    setTiers(t => ({ ...t, [tier]: { ...t[tier], [key]: value } }))
  }

  async function save(tier: PlanTier) {
    setSaving(tier)
    try {
      const res = await fetch('/api/admin/plan-tiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          price: tiers[tier].price,
          customerLimit: tiers[tier].customerLimit,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al guardar'); return }
      setTiers(data)
      toast.success(`Plan ${data[tier].label} actualizado`)
    } catch { toast.error('Error de conexión') }
    finally { setSaving(null) }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <p className="text-xs text-zinc-500">
        Precio y tope de clientes de cada plan. El <span className="text-zinc-400">tope</span> se
        aplica al instante a las cafeterías de ese plan. El <span className="text-zinc-400">precio</span> no
        cobra nada de inmediato: a cada cafetería con cobro automático se le avisa por mail y el
        monto nuevo recién empieza a regir <span className="text-zinc-400">30 días después</span>.
      </p>

      <div className="space-y-2">
        {EDITABLE_TIERS.map(tier => {
          const t = tiers[tier]
          const isFree = tier === 'free'
          return (
            <div key={tier} className="flex items-end gap-3 bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
              <div className="w-24 flex-shrink-0">
                <div className="text-sm font-medium text-white">{t.label}</div>
                <div className="text-[11px] text-zinc-600">{tier}</div>
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-zinc-500 mb-1 block">Tope de clientes</label>
                <input
                  type="number" min={1} max={100000}
                  className={inputCls}
                  value={t.customerLimit ?? 0}
                  onChange={e => set(tier, 'customerLimit', Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-zinc-500 mb-1 block">Precio mensual {isFree && '(siempre 0)'}</label>
                <input
                  type="number" min={0} max={10000000} disabled={isFree}
                  className={`${inputCls} disabled:opacity-40`}
                  value={t.price ?? 0}
                  onChange={e => set(tier, 'price', Number(e.target.value))}
                />
              </div>
              <button
                onClick={() => save(tier)}
                disabled={saving !== null}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
              >
                <Save size={12} />
                {saving === tier ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
