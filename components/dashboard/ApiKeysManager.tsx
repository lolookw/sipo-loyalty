'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Copy, KeyRound } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  prefix: string
  active: boolean
  createdAt: string
  lastUsedAt: string | null
}

const inputStyle = { border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' } as React.CSSProperties

// Sección "Integraciones (API)" de la Configuración del dueño.
// La clave completa se muestra UNA sola vez al crearla.
// apiAllowed=false (plan de prueba/vencido): la API es un beneficio del plan pago.
export default function ApiKeysManager({ cafeId, primaryColor, apiAllowed }: { cafeId: string; primaryColor: string; apiAllowed: boolean }) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [freshKey, setFreshKey] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/apikeys?cafeId=${cafeId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setKeys(data) })
      .catch(() => { /* sin keys */ })
  }, [cafeId])

  async function createKey() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafeId, name: newName }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al crear'); return }
      setKeys([data.apiKey, ...keys])
      setFreshKey(data.key)
      setNewName('')
    } catch { toast.error('Error de conexión') }
    finally { setCreating(false) }
  }

  async function toggleKey(k: ApiKey) {
    setKeys(keys.map(x => x.id === k.id ? { ...x, active: !k.active } : x))
    await fetch('/api/apikeys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: k.id, active: !k.active }),
    })
  }

  async function deleteKey(id: string) {
    if (!confirm('¿Eliminar esta key? Las integraciones que la usen van a dejar de funcionar.')) return
    await fetch(`/api/apikeys?id=${id}`, { method: 'DELETE' })
    setKeys(keys.filter(k => k.id !== id))
    toast.success('Key eliminada')
  }

  async function copyFreshKey() {
    if (!freshKey) return
    try { await navigator.clipboard.writeText(freshKey); toast.success('Key copiada') }
    catch { toast.error('No se pudo copiar') }
  }

  if (!apiAllowed) {
    return (
      <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: '1px solid #E9DED1' }}>
        <p className="font-sans text-sm font-semibold mb-1" style={{ color: '#43352C' }}>
          Disponible con el plan activo ✨
        </p>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          Conectá tu sistema de caja o ERP (Restolia y más) para que las compras sumen puntos solas.
          Esta integración se habilita al activar el plan de tu cafetería — escribinos y lo dejamos andando.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="font-sans text-sm mb-4" style={{ color: '#6B6B6B' }}>
        Conectá tu sistema de caja o ERP a Sipo. Guía y ejemplos en{' '}
        <a href="/developers" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: primaryColor }}>sipo.ar/developers</a>.
      </p>

      {freshKey && (
        <div className="mb-4 p-4 rounded-xl" style={{ background: '#FCFBF8', border: `1.5px solid ${primaryColor}` }}>
          <div className="font-sans text-xs font-semibold mb-2" style={{ color: '#43352C' }}>
            Tu nueva key — copiala AHORA, no se vuelve a mostrar:
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg font-mono text-xs break-all" style={{ background: '#F6F0E8', color: '#43352C' }}>
              {freshKey}
            </code>
            <button onClick={copyFreshKey} className="p-2 rounded-lg" style={{ background: primaryColor, color: 'white' }} title="Copiar">
              <Copy size={14} />
            </button>
          </div>
          <button onClick={() => setFreshKey(null)} className="font-sans text-xs mt-2 underline" style={{ color: '#9B9089' }}>
            Ya la guardé
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nombre (ej: Restolia)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="flex-1 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
          style={inputStyle}
        />
        <button
          onClick={createKey}
          disabled={creating || !newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          style={{ background: primaryColor }}
        >
          <Plus size={14} /> Crear key
        </button>
      </div>

      <div className="space-y-2">
        {keys.map(k => (
          <div
            key={k.id}
            className="p-3.5 rounded-xl flex items-center gap-3"
            style={{ background: '#FCFBF8', border: '1px solid #E9DED1', opacity: k.active ? 1 : 0.55 }}
          >
            <KeyRound size={15} style={{ color: '#9B9089', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-sm truncate" style={{ color: '#43352C' }}>{k.name}</div>
              <div className="font-mono text-xs" style={{ color: '#9B9089' }}>
                {k.prefix} · {k.lastUsedAt ? `último uso ${new Date(k.lastUsedAt).toLocaleDateString('es-AR')}` : 'sin uso todavía'}
              </div>
            </div>
            <button
              onClick={() => toggleKey(k)}
              className="font-sans text-xs px-2.5 py-1.5 rounded-xl font-medium"
              style={{ background: k.active ? '#43352C14' : '#F6F0E8', color: k.active ? '#43352C' : '#9B9089' }}
            >
              {k.active ? 'Activa' : 'Revocada'}
            </button>
            <button
              onClick={() => deleteKey(k.id)}
              className="p-2 rounded-xl"
              style={{ color: '#f87171' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {keys.length === 0 && (
          <p className="font-sans text-xs text-center py-4" style={{ color: '#C0B4A8' }}>
            Sin keys todavía. Creá una para conectar tu caja/ERP.
          </p>
        )}
      </div>
    </div>
  )
}
