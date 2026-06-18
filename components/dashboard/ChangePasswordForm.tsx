'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'

interface Props {
  primaryColor: string
  redirectTo: string
}

export default function ChangePasswordForm({ primaryColor, redirectTo }: Props) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
        toast.success('Contraseña actualizada. Iniciá sesión nuevamente.')
        // Necesitamos forzar re-login para actualizar el JWT token (mustChangePassword)
        const { signOut } = await import('next-auth/react')
        await signOut({ redirect: false })
        router.push(redirectTo.replace('/admin', '/login').replace('/caja', '/login'))
      } else {
        toast.error(data.error || 'Error al cambiar contraseña')
      }
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password" placeholder="Contraseña actual (temporal)"
        value={form.current} onChange={e => setForm({ ...form, current: e.target.value })}
        required
        className="w-full px-4 py-3 rounded-xl font-sans outline-none text-sm transition-colors"
        style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
      />
      <input
        type="password" placeholder="Nueva contraseña"
        value={form.next} onChange={e => setForm({ ...form, next: e.target.value })}
        required minLength={8}
        className="w-full px-4 py-3 rounded-xl font-sans outline-none text-sm transition-colors"
        style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
      />
      <input
        type="password" placeholder="Confirmar nueva contraseña"
        value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
        required minLength={8}
        className="w-full px-4 py-3 rounded-xl font-sans outline-none text-sm transition-colors"
        style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
      />
      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 mt-1"
        style={{ background: primaryColor }}
      >
        {loading ? 'Guardando…' : 'Establecer contraseña'}
      </button>
    </form>
  )
}
