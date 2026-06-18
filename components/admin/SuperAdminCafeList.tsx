'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Cafe {
  id: string
  slug: string
  name: string
  primaryColor: string
  owner: { name: string; email: string }
  _count: { customers: number; staff: number }
}

export default function SuperAdminCafeList({ cafes: initial }: { cafes: Cafe[] }) {
  const [cafes, setCafes] = useState(initial)

  async function deleteCafe(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}" y todos sus datos? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/cafe/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCafes(cafes.filter(c => c.id !== id))
      toast.success('Cafetería eliminada')
    } else {
      toast.error('Error al eliminar')
    }
  }

  if (cafes.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl text-center py-12 text-zinc-600 text-sm">
        No hay cafeterías registradas aún.
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {cafes.map((cafe, i) => (
        <div
          key={cafe.id}
          className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30 transition-colors"
        >
          <div
            className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: cafe.primaryColor }}
          >
            {cafe.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-white">{cafe.name}</div>
            <div className="text-xs text-zinc-500">
              /{cafe.slug} · {cafe.owner.email} · {cafe._count.customers} clientes · {cafe._count.staff} cajeros
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${cafe.slug}/admin`}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Settings size={12} />
              Panel
            </Link>
            <a
              href={`/${cafe.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink size={12} />
              Ver
            </a>
            <button
              onClick={() => deleteCafe(cafe.id, cafe.name)}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
