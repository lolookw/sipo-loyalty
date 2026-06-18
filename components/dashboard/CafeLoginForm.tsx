'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  cafeSlug: string
  primaryColor: string
}

export default function CafeLoginForm({ cafeSlug, primaryColor }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
    const res = await fetch('/api/auth/session')
    const session = await res.json()
    const role = session?.user?.role
    const slug = session?.user?.cafeSlug

    if (role === 'owner' || role === 'superadmin') {
      router.push(`/${slug ?? cafeSlug}/admin`)
    } else if (role === 'cashier') {
      router.push(`/${slug}/caja`)
    } else {
      router.push(`/${cafeSlug}/admin`)
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
        className="w-full px-4 py-3 rounded-xl outline-none text-sm font-sans placeholder:opacity-40 transition-colors"
        style={{ background: '#F6F0E8', border: '1px solid #E9DED1', color: '#43352C' }}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className="w-full px-4 py-3 rounded-xl outline-none text-sm font-sans placeholder:opacity-40 transition-colors"
        style={{ background: '#F6F0E8', border: '1px solid #E9DED1', color: '#43352C' }}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-sans font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 mt-1"
        style={{ background: '#43352C' }}
      >
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
