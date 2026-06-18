'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react'

interface Reward {
  id: string
  name: string
  description: string | null
  pointsCost: number
  active: boolean
  emoji: string | null
}

interface Cafe {
  id: string
  primaryColor: string
  accentColor: string
  pointsEnabled: boolean
  currencySymbol: string
}

const EMOJIS = ['☕', '🥐', '🎂', '🍵', '🍫', '🥤', '🎁', '🏷️', '🎉', '⭐', '🍰', '🥪']

export default function RewardsManager({ cafe, initialRewards }: { cafe: Cafe; initialRewards: Reward[] }) {
  const [rewards, setRewards] = useState<Reward[]>(initialRewards)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newReward, setNewReward] = useState({ name: '', description: '', pointsCost: 200, emoji: '🎁' })
  const [loading, setLoading] = useState(false)
  const primary = cafe.primaryColor
  const accent = cafe.accentColor

  async function addReward() {
    if (!newReward.name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReward, cafeId: cafe.id, active: true }),
      })
      if (res.ok) {
        const created = await res.json()
        setRewards([...rewards, created])
        setNewReward({ name: '', description: '', pointsCost: 200, emoji: '🎁' })
        setAdding(false)
        toast.success('Recompensa creada')
      }
    } catch { toast.error('Error al crear') }
    finally { setLoading(false) }
  }

  async function toggleActive(reward: Reward) {
    const updated = { ...reward, active: !reward.active }
    setRewards(rewards.map(r => r.id === reward.id ? updated : r))
    await fetch('/api/reward', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }

  async function deleteReward(id: string) {
    if (!confirm('¿Eliminar esta recompensa?')) return
    await fetch(`/api/reward?id=${id}`, { method: 'DELETE' })
    setRewards(rewards.filter(r => r.id !== id))
    toast.success('Recompensa eliminada')
  }

  async function saveEdit(reward: Reward) {
    const res = await fetch('/api/reward', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reward),
    })
    if (res.ok) {
      const updated = await res.json()
      setRewards(rewards.map(r => r.id === updated.id ? updated : r))
      setEditing(null)
      toast.success('Guardado')
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>Recompensas</h1>
          <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>Configurá los premios del programa de puntos.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 active:scale-95 transition-all"
          style={{ background: primary }}
        >
          <Plus size={15} /> Nueva
        </button>
      </div>

      {adding && (
        <div
          className="rounded-[24px] p-5 mb-4"
          style={{ background: 'white', border: `2px solid ${accent}`, boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <div className="font-sans font-semibold text-sm mb-4" style={{ color: '#43352C' }}>Nueva recompensa</div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setNewReward({ ...newReward, emoji: e })}
                className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                style={{
                  background: newReward.emoji === e ? `${accent}25` : '#F6F0E8',
                  border: newReward.emoji === e ? `1.5px solid ${accent}` : '1.5px solid transparent',
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="space-y-2.5 mb-4">
            <input
              type="text"
              placeholder="Nombre (ej: Café gratis)"
              value={newReward.name}
              onChange={e => setNewReward({ ...newReward, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
              style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
            />
            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={newReward.description}
              onChange={e => setNewReward({ ...newReward, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
              style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={newReward.pointsCost}
                onChange={e => setNewReward({ ...newReward, pointsCost: parseInt(e.target.value) })}
                className="w-28 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
              />
              <span className="font-sans text-sm" style={{ color: '#9B9089' }}>puntos necesarios</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2.5 rounded-xl font-sans text-sm transition-colors"
              style={{ border: '1px solid #E9DED1', color: '#6B6B6B', background: '#F6F0E8' }}
            >
              Cancelar
            </button>
            <button
              onClick={addReward}
              disabled={loading || !newReward.name.trim()}
              className="flex-1 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
              style={{ background: primary }}
            >
              Crear recompensa
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rewards.map(reward => (
          <div
            key={reward.id}
            className="rounded-[20px] p-4 flex items-center gap-3 transition-opacity"
            style={{
              background: 'white',
              border: '1px solid #E9DED1',
              boxShadow: '0 4px 16px rgba(67,53,44,0.03)',
              opacity: reward.active ? 1 : 0.5,
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: '#F6F0E8' }}
            >
              {reward.emoji || '🎁'}
            </div>

            {editing === reward.id ? (
              <EditInline
                reward={reward}
                primary={primary}
                accent={accent}
                onSave={r => saveEdit(r)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-sm truncate" style={{ color: '#43352C' }}>{reward.name}</div>
                  {reward.description && (
                    <div className="font-sans text-xs truncate" style={{ color: '#9B9089' }}>{reward.description}</div>
                  )}
                  <div className="font-sans text-xs font-semibold mt-0.5" style={{ color: accent }}>
                    {reward.pointsCost.toLocaleString()} pts
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleActive(reward)}
                    className="font-sans text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors"
                    style={{
                      background: reward.active ? `${accent}18` : '#F6F0E8',
                      color: reward.active ? accent : '#9B9089',
                    }}
                  >
                    {reward.active ? 'Activa' : 'Inactiva'}
                  </button>
                  <button
                    onClick={() => setEditing(reward.id)}
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: '#9B9089' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F6F0E8'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => deleteReward(reward.id)}
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: '#f87171' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {rewards.length === 0 && !adding && (
          <div className="text-center py-16" style={{ color: '#C0B4A8' }}>
            <div className="text-3xl mb-2">🎁</div>
            <div className="font-sans text-sm">Todavía no hay recompensas.<br />Creá la primera para empezar.</div>
          </div>
        )}
      </div>
    </div>
  )
}

function EditInline({ reward, primary, accent, onSave, onCancel }: {
  reward: Reward; primary: string; accent: string
  onSave: (r: Reward) => void; onCancel: () => void
}) {
  const [data, setData] = useState({ ...reward })
  return (
    <div className="flex-1 space-y-2">
      <input
        type="text"
        value={data.name}
        onChange={e => setData({ ...data, name: e.target.value })}
        className="w-full px-3 py-2 rounded-xl font-sans outline-none text-sm transition-colors"
        style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
      />
      <input
        type="text"
        value={data.description || ''}
        onChange={e => setData({ ...data, description: e.target.value })}
        className="w-full px-3 py-2 rounded-xl font-sans outline-none text-xs transition-colors"
        style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={data.pointsCost}
          onChange={e => setData({ ...data, pointsCost: parseInt(e.target.value) })}
          className="w-24 px-3 py-1.5 rounded-xl font-sans outline-none text-sm transition-colors"
          style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
        />
        <span className="font-sans text-xs" style={{ color: '#9B9089' }}>pts</span>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl transition-colors"
            style={{ color: '#9B9089' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F6F0E8'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <X size={13} />
          </button>
          <button
            onClick={() => onSave(data)}
            className="p-1.5 rounded-xl text-white"
            style={{ background: accent }}
          >
            <Check size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
