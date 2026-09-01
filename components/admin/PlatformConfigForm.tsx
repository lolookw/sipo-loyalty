'use client'

import { useState } from 'react'
import { Save, MessageCircle, Mail, Instagram } from 'lucide-react'
import toast from 'react-hot-toast'

interface Config {
  contactEmail: string | null
  whatsappNumber: string | null
  whatsappUrl: string | null
  instagramUrl: string | null
  xUrl: string | null
  graceDays: number
  capacityWarningPercent: number
  priceChangeNoticeDays: number
}

const inputCls =
  'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/50 transition-colors'
const labelCls = 'text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5'

export default function PlatformConfigForm({ config: initial }: { config: Config }) {
  const [config, setConfig] = useState<Config>(initial)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig(c => ({ ...c, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/platform-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        const saved = await res.json()
        setConfig(saved)
        toast.success('Configuración guardada')
      } else {
        toast.error('Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <p className="text-xs text-zinc-500">
        Estos datos alimentan los botones de contacto de la landing pública (<span className="text-zinc-400">/demo</span>) y los links sociales del pie.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}><MessageCircle size={12} /> WhatsApp (número, formato internacional)</label>
          <input
            className={inputCls}
            placeholder="5493411234567"
            value={config.whatsappNumber ?? ''}
            onChange={e => set('whatsappNumber', e.target.value)}
          />
          <p className="text-[11px] text-zinc-600 mt-1">Solo dígitos. Se usa para armar el link wa.me automáticamente.</p>
        </div>

        <div>
          <label className={labelCls}><Mail size={12} /> Email de contacto</label>
          <input
            className={inputCls}
            placeholder="hola@sipo.ar"
            value={config.contactEmail ?? ''}
            onChange={e => set('contactEmail', e.target.value)}
          />
          <p className="text-[11px] text-zinc-600 mt-1">Fallback si no hay WhatsApp.</p>
        </div>

        <div>
          <label className={labelCls}><Instagram size={12} /> Instagram (URL)</label>
          <input
            className={inputCls}
            placeholder="https://instagram.com/sipo.ar"
            value={config.instagramUrl ?? ''}
            onChange={e => set('instagramUrl', e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>X / Twitter (URL)</label>
          <input
            className={inputCls}
            placeholder="https://x.com/sipo_ar"
            value={config.xUrl ?? ''}
            onChange={e => set('xUrl', e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>WhatsApp link directo (opcional)</label>
          <input
            className={inputCls}
            placeholder="https://wa.me/549..."
            value={config.whatsappUrl ?? ''}
            onChange={e => set('whatsappUrl', e.target.value)}
          />
          <p className="text-[11px] text-zinc-600 mt-1">Si lo cargás, tiene prioridad sobre el número.</p>
        </div>

        <div>
          <label className={labelCls}>Días de gracia tras vencimiento</label>
          <input
            type="number"
            min={0}
            max={90}
            className={inputCls}
            value={config.graceDays}
            onChange={e => set('graceDays', Number(e.target.value))}
          />
          <p className="text-[11px] text-zinc-600 mt-1">Plazo de aviso antes de cortar el servicio a un café vencido.</p>
        </div>

        <div>
          <label className={labelCls}>% de cupo que dispara el aviso de capacidad</label>
          <input
            type="number"
            min={1}
            max={100}
            className={inputCls}
            value={config.capacityWarningPercent}
            onChange={e => set('capacityWarningPercent', Number(e.target.value))}
          />
          <p className="text-[11px] text-zinc-600 mt-1">Le avisamos al dueño cuando su cantidad de clientes llega a este % del tope de su tier.</p>
        </div>
        <div>
          <label className={labelCls}>Días de aviso antes de un aumento</label>
          <input
            type="number"
            min={0}
            max={90}
            className={inputCls}
            value={config.priceChangeNoticeDays}
            onChange={e => set('priceChangeNoticeDays', Number(e.target.value))}
          />
          <p className="text-[11px] text-zinc-600 mt-1">Cuánto antes se le avisa a cada cafetería que cambia el precio de su plan.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Save size={14} />
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
