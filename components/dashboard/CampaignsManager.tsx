'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit3 } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  type: string // "points_multiplier" | "stamp_multiplier" | "bonus_points" | "signup_bonus"
  multiplier: number | null
  bonusPoints: number | null
  bonusStamps: number | null
  bonusExpiryDays: number
  startsAt: string
  endsAt: string
  active: boolean
}

interface Cafe {
  id: string
  primaryColor: string
  accentColor: string
  stampEnabled: boolean
  pointsEnabled: boolean
}

const TYPE_OPTIONS = [
  { value: 'points_multiplier', label: 'Multiplicar puntos', emoji: '✨', hint: 'ej: x2 puntos por compra' },
  { value: 'stamp_multiplier', label: 'Multiplicar sellos', emoji: '🔥', hint: 'ej: x2 sellos por visita' },
  { value: 'bonus_points', label: 'Puntos de regalo', emoji: '🎁', hint: 'pts extra por cada compra' },
  { value: 'signup_bonus', label: 'Bono de bienvenida', emoji: '🎉', hint: 'pts y/o sellos por registrarse' },
]

type FormState = {
  name: string
  type: string
  multiplier: number
  bonusPoints: number
  bonusStamps: number
  bonusExpiryDays: number
  startsAt: string // yyyy-mm-dd
  endsAt: string
}

const emptyForm = (): FormState => {
  const today = new Date()
  const inAWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { name: '', type: 'points_multiplier', multiplier: 2, bonusPoints: 50, bonusStamps: 1, bonusExpiryDays: 30, startsAt: iso(today), endsAt: iso(inAWeek) }
}

function campaignStatus(c: Campaign): { label: string; live: boolean; done: boolean } {
  const now = new Date()
  if (!c.active) return { label: 'Pausada', live: false, done: false }
  if (now < new Date(c.startsAt)) return { label: 'Programada', live: false, done: false }
  if (now > new Date(c.endsAt)) return { label: 'Finalizada', live: false, done: true }
  return { label: 'En curso', live: true, done: false }
}

function valueSummary(c: Campaign): string {
  if (c.type === 'points_multiplier') return `x${c.multiplier} puntos por compra`
  if (c.type === 'stamp_multiplier') return `x${c.multiplier} sellos por visita`
  if (c.type === 'signup_bonus') {
    const parts: string[] = []
    if (c.bonusPoints) parts.push(`+${c.bonusPoints} pts`)
    if (c.bonusStamps) parts.push(`+${c.bonusStamps} ${c.bonusStamps === 1 ? 'sello' : 'sellos'}`)
    return `${parts.join(' y ')} al registrarse`
  }
  return `+${c.bonusPoints} pts de regalo por compra · valen ${c.bonusExpiryDays} días`
}

function fmtRange(c: Campaign): string {
  const f = (s: string) => new Date(s).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  return `${f(c.startsAt)} → ${f(c.endsAt)}`
}

export default function CampaignsManager({ cafe, initialCampaigns }: { cafe: Cafe; initialCampaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [signupWantsPoints, setSignupWantsPoints] = useState(true)
  const [signupWantsStamps, setSignupWantsStamps] = useState(false)
  const [loading, setLoading] = useState(false)
  const primary = cafe.primaryColor
  const accent = cafe.accentColor

  const inputStyle = { border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' } as React.CSSProperties

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setSignupWantsPoints(true)
    setSignupWantsStamps(false)
    setFormOpen(true)
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      type: c.type,
      multiplier: c.multiplier ?? 2,
      bonusPoints: c.bonusPoints ?? 50,
      bonusStamps: c.bonusStamps ?? 1,
      bonusExpiryDays: c.bonusExpiryDays,
      startsAt: c.startsAt.slice(0, 10),
      endsAt: c.endsAt.slice(0, 10),
    })
    setSignupWantsPoints(c.type !== 'signup_bonus' || !!c.bonusPoints)
    setSignupWantsStamps(c.type === 'signup_bonus' && !!c.bonusStamps)
    setFormOpen(true)
  }

  // El día de inicio arranca a las 00:00 y el de fin cierra a las 23:59 (hora local)
  function payloadFromForm() {
    const isMult = form.type === 'points_multiplier' || form.type === 'stamp_multiplier'
    const isSignup = form.type === 'signup_bonus'
    return {
      name: form.name,
      type: form.type,
      multiplier: isMult ? form.multiplier : null,
      bonusPoints: isMult ? null : (isSignup ? (signupWantsPoints ? form.bonusPoints : null) : form.bonusPoints),
      bonusStamps: isSignup && signupWantsStamps ? form.bonusStamps : null,
      bonusExpiryDays: form.bonusExpiryDays,
      startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
      endsAt: new Date(`${form.endsAt}T23:59:59.999`).toISOString(),
    }
  }

  async function save() {
    if (!form.name.trim()) return
    if (form.type === 'signup_bonus' && !signupWantsPoints && !signupWantsStamps) {
      toast.error('Activá puntos y/o sellos de regalo')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/campaign', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payloadFromForm() } : { cafeId: cafe.id, ...payloadFromForm() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al guardar')
        return
      }
      setCampaigns(editingId ? campaigns.map(c => c.id === data.id ? data : c) : [data, ...campaigns])
      setFormOpen(false)
      setEditingId(null)
      toast.success(editingId ? 'Campaña actualizada' : 'Campaña creada')
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  async function toggleActive(c: Campaign) {
    const updated = { ...c, active: !c.active }
    setCampaigns(campaigns.map(x => x.id === c.id ? updated : x))
    await fetch('/api/campaign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    })
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta campaña?')) return
    await fetch(`/api/campaign?id=${id}`, { method: 'DELETE' })
    setCampaigns(campaigns.filter(c => c.id !== id))
    toast.success('Campaña eliminada')
  }

  const visibleTypes = TYPE_OPTIONS.filter(t => {
    if (t.value === 'stamp_multiplier') return cafe.stampEnabled
    if (t.value === 'signup_bonus') return cafe.stampEnabled || cafe.pointsEnabled
    return cafe.pointsEnabled
  })

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>Campañas</h1>
          <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>Promos por tiempo limitado: puntos dobles, sellos dobles o puntos de regalo.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 active:scale-95 transition-all"
          style={{ background: primary }}
        >
          <Plus size={15} /> Nueva
        </button>
      </div>

      {formOpen && (
        <div
          className="rounded-[24px] p-5 mb-4"
          style={{ background: 'white', border: `2px solid ${accent}`, boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <div className="font-sans font-semibold text-sm mb-4" style={{ color: '#43352C' }}>
            {editingId ? 'Editar campaña' : 'Nueva campaña'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            {visibleTypes.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, type: t.value })}
                className="rounded-xl p-3 text-left transition-all"
                style={{
                  background: form.type === t.value ? `${accent}18` : '#F6F0E8',
                  border: form.type === t.value ? `1.5px solid ${accent}` : '1.5px solid transparent',
                }}
              >
                <div className="text-lg mb-0.5">{t.emoji}</div>
                <div className="font-sans font-semibold text-xs" style={{ color: '#43352C' }}>{t.label}</div>
                <div className="font-sans text-xs mt-0.5" style={{ color: '#9B9089' }}>{t.hint}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2.5 mb-4">
            <input
              type="text"
              placeholder="Nombre (ej: Finde de puntos dobles)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
              style={inputStyle}
            />

            {(form.type === 'points_multiplier' || form.type === 'stamp_multiplier') && (
              <div className="flex items-center gap-3">
                <span className="font-sans text-sm" style={{ color: '#9B9089' }}>x</span>
                <input
                  type="number"
                  min={2}
                  max={10}
                  step={1}
                  value={form.multiplier}
                  onChange={e => setForm({ ...form, multiplier: Number(e.target.value) })}
                  className="w-24 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
                  style={inputStyle}
                />
                <span className="font-sans text-sm" style={{ color: '#9B9089' }}>
                  {form.type === 'points_multiplier' ? 'los puntos de cada compra' : 'los sellos de cada visita'}
                </span>
              </div>
            )}

            {form.type === 'bonus_points' && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={form.bonusPoints}
                    onChange={e => setForm({ ...form, bonusPoints: Number(e.target.value) })}
                    className="w-28 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
                    style={inputStyle}
                  />
                  <span className="font-sans text-sm" style={{ color: '#9B9089' }}>pts de regalo por cada compra</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.bonusExpiryDays}
                    onChange={e => setForm({ ...form, bonusExpiryDays: Number(e.target.value) })}
                    className="w-28 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
                    style={inputStyle}
                  />
                  <span className="font-sans text-sm" style={{ color: '#9B9089' }}>días de validez del regalo</span>
                </div>
              </div>
            )}

            {form.type === 'signup_bonus' && (
              <div className="space-y-2.5">
                <p className="font-sans text-xs" style={{ color: '#9B9089' }}>
                  Se acredita una sola vez, cuando el cliente se registra por primera vez en tu café
                  (por la página de fidelidad, en caja o por integraciones).
                </p>
                {cafe.pointsEnabled && (
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={signupWantsPoints} onChange={e => setSignupWantsPoints(e.target.checked)} className="w-4 h-4" />
                    <input
                      type="number"
                      min={1}
                      disabled={!signupWantsPoints}
                      value={form.bonusPoints}
                      onChange={e => setForm({ ...form, bonusPoints: Number(e.target.value) })}
                      className="w-28 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm disabled:opacity-40"
                      style={inputStyle}
                    />
                    <span className="font-sans text-sm" style={{ color: '#9B9089' }}>pts de regalo al registrarse</span>
                  </label>
                )}
                {cafe.stampEnabled && (
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={signupWantsStamps} onChange={e => setSignupWantsStamps(e.target.checked)} className="w-4 h-4" />
                    <input
                      type="number"
                      min={1}
                      max={50}
                      disabled={!signupWantsStamps}
                      value={form.bonusStamps}
                      onChange={e => setForm({ ...form, bonusStamps: Number(e.target.value) })}
                      className="w-28 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm disabled:opacity-40"
                      style={inputStyle}
                    />
                    <span className="font-sans text-sm" style={{ color: '#9B9089' }}>sellos de regalo al registrarse</span>
                  </label>
                )}
                {signupWantsPoints && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={form.bonusExpiryDays}
                      onChange={e => setForm({ ...form, bonusExpiryDays: Number(e.target.value) })}
                      className="w-28 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
                      style={inputStyle}
                    />
                    <span className="font-sans text-sm" style={{ color: '#9B9089' }}>días de validez de los puntos</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2.5 flex-wrap">
              <div>
                <label className="font-sans text-xs block mb-1" style={{ color: '#9B9089' }}>Desde</label>
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={e => setForm({ ...form, startsAt: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="font-sans text-xs block mb-1" style={{ color: '#9B9089' }}>Hasta (inclusive)</label>
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={e => setForm({ ...form, endsAt: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setFormOpen(false); setEditingId(null) }}
              className="px-4 py-2.5 rounded-xl font-sans text-sm"
              style={{ border: '1px solid #E9DED1', color: '#6B6B6B', background: '#F6F0E8' }}
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={loading || !form.name.trim()}
              className="flex-1 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
              style={{ background: primary }}
            >
              {editingId ? 'Guardar cambios' : 'Crear campaña'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map(c => {
          const status = campaignStatus(c)
          const emoji = TYPE_OPTIONS.find(t => t.value === c.type)?.emoji ?? '🔥'
          return (
            <div
              key={c.id}
              className="rounded-[20px] p-4 flex items-center gap-3"
              style={{
                background: 'white',
                border: status.live ? `1.5px solid ${accent}66` : '1px solid #E9DED1',
                boxShadow: '0 4px 16px rgba(67,53,44,0.03)',
                opacity: !c.active || status.done ? 0.55 : 1,
              }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#F6F0E8' }}>
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-sans font-semibold text-sm truncate" style={{ color: '#43352C' }}>{c.name}</div>
                <div className="font-sans text-xs truncate" style={{ color: '#9B9089' }}>{valueSummary(c)}</div>
                <div className="font-sans text-xs font-medium mt-0.5" style={{ color: status.live ? accent : '#9B9089' }}>
                  {status.label} · {fmtRange(c)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleActive(c)}
                  className="font-sans text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors"
                  style={{
                    background: c.active ? `${accent}18` : '#F6F0E8',
                    color: c.active ? accent : '#9B9089',
                  }}
                >
                  {c.active ? 'Activa' : 'Pausada'}
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: '#9B9089' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F6F0E8'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => remove(c.id)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}

        {campaigns.length === 0 && !formOpen && (
          <div className="text-center py-16" style={{ color: '#C0B4A8' }}>
            <div className="text-3xl mb-2">🔥</div>
            <div className="font-sans text-sm">Todavía no hay campañas.<br />Creá una promo por tiempo limitado para mover el local.</div>
          </div>
        )}
      </div>
    </div>
  )
}
