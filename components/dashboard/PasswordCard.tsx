'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Key } from 'lucide-react'

const sInputClass = 'w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors'
const sInputStyle = { border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }

/**
 * Cambio de contraseña del propio usuario desde el panel. Distinto de ChangePasswordForm, que es
 * la pantalla obligatoria del primer ingreso y redirige después de cambiarla.
 */
export default function PasswordCard({ primaryColor }: { primaryColor: string }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  async function handleChangePassword() {
    if (form.next !== form.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (form.next.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Contraseña actualizada')
        setForm({ current: '', next: '', confirm: '' })
      } else {
        toast.error(data.error || 'Error al cambiar contraseña')
      }
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div
      className="rounded-[24px] p-6"
      style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
    >
      <h2
        className="font-sans text-sm font-semibold tracking-tight mb-5 pb-4 flex items-center gap-2"
        style={{ color: '#43352C', borderBottom: '1px solid #F6F0E8' }}
      >
        <Key size={14} /> Cambiar contraseña
      </h2>
      <div className="space-y-3 max-w-sm">
        <input
          type="password" placeholder="Contraseña actual" value={form.current}
          onChange={e => setForm({ ...form, current: e.target.value })}
          className={sInputClass} style={sInputStyle}
        />
        <input
          type="password" placeholder="Nueva contraseña" value={form.next}
          onChange={e => setForm({ ...form, next: e.target.value })}
          className={sInputClass} style={sInputStyle}
        />
        <input
          type="password" placeholder="Confirmar nueva contraseña" value={form.confirm}
          onChange={e => setForm({ ...form, confirm: e.target.value })}
          className={sInputClass} style={sInputStyle}
        />
        <button
          type="button"
          onClick={handleChangePassword}
          disabled={loading || !form.current || !form.next || !form.confirm}
          className="px-5 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          style={{ background: primaryColor }}
        >
          {loading ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </div>
  )
}
