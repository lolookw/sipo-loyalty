'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Trash2, UserPlus } from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  email: string
}

const sInputClass = 'w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors'
const sInputStyle = { border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }

export default function StaffManager({ cafeId, initialStaff, primaryColor }: {
  cafeId: string
  initialStaff: StaffMember[]
  primaryColor: string
}) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [adding, setAdding] = useState(false)
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function addStaff() {
    if (!newStaff.name || !newStaff.email || !newStaff.password) return
    if (newStaff.password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newStaff, cafeId }),
      })
      const data = await res.json()
      if (res.ok) {
        setStaff([data, ...staff])
        setNewStaff({ name: '', email: '', password: '' })
        setAdding(false)
        toast.success('Cajero creado')
      } else {
        toast.error(data.error || 'Error al crear cajero')
      }
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  async function removeStaff(id: string, name: string) {
    if (!confirm(`¿Eliminar al cajero ${name}?`)) return
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStaff(staff.filter(s => s.id !== id))
      toast.success('Cajero eliminado')
    } else {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div
      className="rounded-[24px] p-6"
      style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
    >
      <div
        className="flex items-center justify-between pb-4 mb-5"
        style={{ borderBottom: '1px solid #F6F0E8' }}
      >
        <h2 className="font-sans text-sm font-semibold" style={{ color: '#43352C' }}>Cajeros</h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-sans text-xs font-medium text-white transition-all hover:opacity-90"
          style={{ background: primaryColor }}
        >
          <UserPlus size={13} /> Agregar cajero
        </button>
      </div>

      {adding && (
        <div
          className="mb-5 p-4 rounded-xl space-y-2.5"
          style={{ background: '#FCFBF8', border: '1px solid #E9DED1' }}
        >
          <div className="font-sans text-xs font-semibold mb-3" style={{ color: '#43352C' }}>Nuevo cajero</div>
          <input
            type="text" placeholder="Nombre completo" value={newStaff.name}
            onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
            className={sInputClass} style={sInputStyle}
          />
          <input
            type="email" placeholder="Email" value={newStaff.email}
            onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
            className={sInputClass} style={sInputStyle}
          />
          <input
            type="text" placeholder="Contraseña temporal (mín. 8 caracteres)" value={newStaff.password}
            onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
            className={`${sInputClass} font-mono`} style={sInputStyle}
          />
          <p className="font-sans text-xs" style={{ color: '#9B9089' }}>
            El cajero deberá cambiar la contraseña en su primer inicio de sesión.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-xl font-sans text-sm transition-colors"
              style={{ border: '1px solid #E9DED1', color: '#6B6B6B', background: '#F6F0E8' }}
            >
              Cancelar
            </button>
            <button
              type="button" onClick={addStaff} disabled={loading}
              className="flex-1 py-2 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
              style={{ background: primaryColor }}
            >
              {loading ? 'Creando…' : 'Crear cajero'}
            </button>
          </div>
        </div>
      )}

      {staff.length === 0 && !adding ? (
        <p className="font-sans text-sm text-center py-4" style={{ color: '#9B9089' }}>No hay cajeros registrados.</p>
      ) : (
        <div className="space-y-2">
          {staff.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-3 py-2.5 last:border-0"
              style={{ borderBottom: '1px solid #F6F0E8' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{ background: '#F6F0E8', color: '#6B6B6B' }}
              >
                {s.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-sans text-sm font-medium truncate" style={{ color: '#43352C' }}>{s.name}</div>
                <div className="font-sans text-xs" style={{ color: '#9B9089' }}>{s.email}</div>
              </div>
              <button
                type="button"
                onClick={() => removeStaff(s.id, s.name)}
                className="p-1.5 rounded-xl transition-colors"
                style={{ color: '#f87171' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
