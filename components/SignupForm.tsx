'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Coffee, Check } from 'lucide-react'

const inputStyle: React.CSSProperties = { background: '#F6F0E8', border: '1px solid #E9DED1', color: '#43352C' }
const inputCls = 'w-full px-4 py-3 rounded-2xl outline-none text-sm font-sans placeholder:opacity-40 transition-colors focus:border-[#B56A4C]'

export default function SignupForm() {
  const [form, setForm] = useState({ cafeName: '', ownerName: '', email: '', phone: '', city: '', instagram: '', message: '', referredBy: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.cafeName.trim() || !form.ownerName.trim() || !form.email.trim()) {
      setError('Completá al menos el nombre de la cafetería, tu nombre y tu email.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setDone(true)
      else setError(data.error || 'Hubo un error. Probá de nuevo.')
    } catch {
      setError('Error de conexión. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#43352C' }}>
          <Check size={28} color="white" />
        </div>
        <h2 className="font-serif font-medium mb-3" style={{ fontSize: '1.8rem', color: '#43352C' }}>
          ¡Recibido! ☕
        </h2>
        <p className="font-sans text-sm leading-relaxed max-w-sm mx-auto mb-8" style={{ color: '#6B6B6B' }}>
          Gracias por querer sumar tu cafetería a Sipo. Te vamos a contactar muy pronto para dejar todo listo.
        </p>
        <Link href="/demo" className="font-sans text-sm underline hover:opacity-70" style={{ color: '#B56A4C' }}>
          Volver
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="font-sans text-xs font-medium mb-1.5 block" style={{ color: '#6B6B6B' }}>Nombre de la cafetería *</label>
          <input className={inputCls} style={inputStyle} value={form.cafeName} onChange={e => set('cafeName', e.target.value)} placeholder="Cafetería San Martín" required />
        </div>
        <div>
          <label className="font-sans text-xs font-medium mb-1.5 block" style={{ color: '#6B6B6B' }}>Tu nombre *</label>
          <input className={inputCls} style={inputStyle} value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Juan García" required />
        </div>
        <div>
          <label className="font-sans text-xs font-medium mb-1.5 block" style={{ color: '#6B6B6B' }}>Email *</label>
          <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} placeholder="vos@cafeteria.com" required />
        </div>
        <div>
          <label className="font-sans text-xs font-medium mb-1.5 block" style={{ color: '#6B6B6B' }}>WhatsApp / teléfono</label>
          <input className={inputCls} style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 9 341 ..." />
        </div>
        <div>
          <label className="font-sans text-xs font-medium mb-1.5 block" style={{ color: '#6B6B6B' }}>Ciudad</label>
          <input className={inputCls} style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Rosario" />
        </div>
        <div>
          <label className="font-sans text-xs font-medium mb-1.5 block" style={{ color: '#6B6B6B' }}>Instagram de la cafetería</label>
          <input className={inputCls} style={inputStyle} value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@micafeteria" />
        </div>
      </div>
      <div>
        <label className="font-sans text-xs font-medium mb-1.5 block" style={{ color: '#6B6B6B' }}>¿Alguna cafetería te recomendó Sipo? (opcional)</label>
        <input className={inputCls} style={inputStyle} value={form.referredBy} onChange={e => set('referredBy', e.target.value)} placeholder="Nombre de la cafetería" />
        <p className="font-sans text-xs mt-1.5" style={{ color: '#C0B4A8' }}>Si nos decís quién, le regalamos un mes de su plan.</p>
      </div>
      <div>
        <label className="font-sans text-xs font-medium mb-1.5 block" style={{ color: '#6B6B6B' }}>¿Algo que quieras contarnos? (opcional)</label>
        <textarea className={`${inputCls} resize-none`} style={inputStyle} rows={3} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Cuántos locales tenés, qué buscás..." />
      </div>

      {error && <p className="font-sans text-sm" style={{ color: '#c0392b' }}>{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        style={{ background: '#43352C' }}
      >
        {loading ? 'Enviando…' : 'Sumar mi cafetería'}
      </button>
      <p className="font-sans text-xs text-center" style={{ color: '#C0B4A8' }}>
        Sin contratos ni letra chica. Empezás con el plan gratuito.
      </p>
    </form>
  )
}
