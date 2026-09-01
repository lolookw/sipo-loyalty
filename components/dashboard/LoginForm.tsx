'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const inputClass = "w-full px-4 py-3 rounded-2xl font-sans text-sm outline-none transition-colors"
const inputStyle = { background: '#FAF7F2', border: '1px solid #e8dece', color: '#1C1917' }

export default function LoginForm() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      toast.error('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      toast.success('¡Bienvenido/a!')
      // Destino neutro: acá no hay página, el middleware resuelve a qué panel va cada rol
      // (superadmin → /admin, dueño → /[cafe]/admin, cajero → /[cafe]/caja). El formulario no
      // conoce el rol todavía, y así la regla de "quién va a dónde" vive en un solo lugar.
      router.push('/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className={inputClass}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className={inputClass}
        style={inputStyle}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-50 mt-1"
        style={{ background: '#43352C' }}
      >
        {loading ? 'Ingresando…' : 'Ingresar al panel'}
      </button>
    </form>
  )
}
