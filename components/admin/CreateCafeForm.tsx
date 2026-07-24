'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface CreateCafeInitial {
  ownerName?: string
  ownerEmail?: string
  cafeName?: string
  cafeSlug?: string
}

export default function CreateCafeForm({ initial }: { initial?: CreateCafeInitial }) {
  const [form, setForm] = useState({
    ownerName: initial?.ownerName ?? '',
    ownerEmail: initial?.ownerEmail ?? '',
    ownerPassword: '',
    cafeName: initial?.cafeName ?? '',
    cafeSlug: initial?.cafeSlug ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<{ cafeName: string; slug: string; email: string } | null>(null)

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-cafe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setCreated({ cafeName: form.cafeName, slug: form.cafeSlug, email: form.ownerEmail })
        setForm({ ownerName: '', ownerEmail: '', ownerPassword: '', cafeName: '', cafeSlug: '' })
        toast.success(`Cafetería creada exitosamente`)
      } else {
        toast.error(data.error || 'Error al crear')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {created && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm">
          <div className="font-semibold text-green-800 mb-1">✓ {created.cafeName} creada</div>
          <div className="text-green-700 text-xs space-y-0.5">
            <div>Login: <span className="font-mono">{created.email}</span></div>
            <div>Página: <a href={`/${created.slug}`} target="_blank" className="underline">/{created.slug}</a></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-100 p-6">
        <div className="grid grid-cols-2 gap-6">

          {/* Owner */}
          <div className="space-y-4">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">
              Dueño / Admin
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Nombre completo</label>
              <input
                type="text"
                value={form.ownerName}
                onChange={e => set('ownerName', e.target.value)}
                placeholder="Juan García"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 outline-none focus:border-zinc-400 text-sm transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Email</label>
              <input
                type="email"
                value={form.ownerEmail}
                onChange={e => set('ownerEmail', e.target.value)}
                placeholder="owner@cafeteria.com"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 outline-none focus:border-zinc-400 text-sm transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Contraseña temporal</label>
              <input
                type="text"
                value={form.ownerPassword}
                onChange={e => set('ownerPassword', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 outline-none focus:border-zinc-400 text-sm transition-colors font-mono"
              />
              <p className="text-xs text-zinc-400 mt-1">Compartila con el dueño para que cambie su contraseña.</p>
            </div>
          </div>

          {/* Café */}
          <div className="space-y-4">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">
              Cafetería
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Nombre</label>
              <input
                type="text"
                value={form.cafeName}
                onChange={e => {
                  set('cafeName', e.target.value)
                  if (!form.cafeSlug) {
                    set('cafeSlug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
                  }
                }}
                placeholder="Cafetería San Martín"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 outline-none focus:border-zinc-400 text-sm transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Slug (URL)</label>
              <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden focus-within:border-zinc-400 transition-colors">
                <span className="px-3 py-2.5 text-sm text-zinc-400 bg-zinc-50 border-r border-zinc-200">/</span>
                <input
                  type="text"
                  value={form.cafeSlug}
                  onChange={e => set('cafeSlug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                  placeholder="cafeteria-san-martin"
                  required
                  className="flex-1 px-3 py-2.5 outline-none text-sm bg-transparent"
                />
              </div>
              {form.cafeSlug && (
                <p className="text-xs text-zinc-400 mt-1">
                  Página pública: <span className="font-mono">/{form.cafeSlug}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg font-semibold text-white text-sm bg-zinc-900 hover:bg-zinc-800 active:scale-95 disabled:opacity-60 transition-all"
          >
            {loading ? 'Creando…' : 'Crear cafetería'}
          </button>
        </div>
      </form>
    </div>
  )
}
