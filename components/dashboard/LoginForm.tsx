'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
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
      return
    }
    toast.success('¡Bienvenido/a!')
    // El rol recién se conoce después de autenticar, así que se lee la sesión y se va derecho al
    // panel que corresponde. Antes esto empujaba a /dashboard, el panel viejo: los cajeros y el
    // superadmin caían en una pantalla vacía y los dueños en una copia desactualizada del suyo.
    const session = await getSession()
    const role = session?.user?.role
    const slug = session?.user?.cafeSlug
    if (role === 'superadmin') router.push('/admin')
    else if (slug) router.push(role === 'cashier' ? `/${slug}/caja` : `/${slug}/admin`)
    else router.push('/')
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
