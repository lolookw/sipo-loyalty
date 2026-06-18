'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function SuperAdminLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      toast.error('Credenciales incorrectas')
      setLoading(false)
      return
    }
    const res = await fetch('/api/auth/session')
    const session = await res.json()
    if (session?.user?.role !== 'superadmin') {
      toast.error('No tenés acceso a esta área')
      setLoading(false)
      return
    }
    router.push('/admin')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="off"
        className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-zinc-500 transition-colors text-sm"
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoComplete="off"
        className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-zinc-500 transition-colors text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-amber-500 font-semibold text-zinc-950 text-sm transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-60 mt-1"
      >
        {loading ? 'Verificando…' : 'Acceder'}
      </button>
    </form>
  )
}
