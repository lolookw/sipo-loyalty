'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, Trash2, PlusCircle, Mail, Phone, MapPin, Instagram } from 'lucide-react'
import toast from 'react-hot-toast'

interface SignupRequest {
  id: string
  cafeName: string
  ownerName: string
  email: string
  phone: string | null
  city: string | null
  instagram: string | null
  message: string | null
  status: string
  createdAt: string
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function SignupRequestsList({ requests: initial }: { requests: SignupRequest[] }) {
  const [requests, setRequests] = useState(initial)

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/signup-request/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setRequests(rs => rs.filter(r => r.id !== id))
      toast.success(status === 'approved' ? 'Marcada como aprobada' : 'Marcada como rechazada')
    } else toast.error('Error')
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta solicitud?')) return
    const res = await fetch(`/api/admin/signup-request/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRequests(rs => rs.filter(r => r.id !== id))
      toast.success('Eliminada')
    } else toast.error('Error')
  }

  if (requests.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl text-center py-10 text-zinc-600 text-sm">
        No hay solicitudes pendientes.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map(r => {
        const prefill = `/admin?poName=${encodeURIComponent(r.ownerName)}&poEmail=${encodeURIComponent(r.email)}&poCafe=${encodeURIComponent(r.cafeName)}&poSlug=${encodeURIComponent(slugify(r.cafeName))}#nueva-cafeteria`
        return (
          <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm">{r.cafeName}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{r.ownerName}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5"><Mail size={11} />{r.email}</span>
                  {r.phone && <span className="flex items-center gap-1.5"><Phone size={11} />{r.phone}</span>}
                  {r.city && <span className="flex items-center gap-1.5"><MapPin size={11} />{r.city}</span>}
                  {r.instagram && <span className="flex items-center gap-1.5"><Instagram size={11} />{r.instagram}</span>}
                </div>
                {r.message && <p className="text-xs text-zinc-500 mt-2 italic">“{r.message}”</p>}
                <div className="text-[11px] text-zinc-600 mt-2">{new Date(r.createdAt).toLocaleDateString('es-AR')}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Link
                href={prefill}
                className="flex items-center gap-1.5 text-xs text-zinc-950 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-lg font-semibold transition-colors"
              >
                <PlusCircle size={12} /> Crear café
              </Link>
              <button onClick={() => setStatus(r.id, 'approved')} className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-green-400 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                <Check size={12} /> Aprobada
              </button>
              <button onClick={() => setStatus(r.id, 'rejected')} className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-orange-400 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                <X size={12} /> Rechazar
              </button>
              <button onClick={() => remove(r.id)} className="ml-auto p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
