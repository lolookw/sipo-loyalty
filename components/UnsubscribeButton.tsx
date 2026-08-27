'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

export default function UnsubscribeButton({ id, cafeName, alreadyOptedOut }: { id: string; cafeName: string; alreadyOptedOut: boolean }) {
  const [done, setDone] = useState(alreadyOptedOut)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await fetch(`/api/unsubscribe/${id}`, { method: 'POST' })
      if (res.ok) setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <>
        <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F6F0E8' }}>
          <Check size={18} color="#43352C" />
        </div>
        <p className="font-sans text-sm" style={{ color: '#43352C' }}>
          Listo, no vas a recibir más avisos de difusión de <strong>{cafeName}</strong>.
        </p>
      </>
    )
  }

  return (
    <>
      <p className="font-sans text-sm mb-5" style={{ color: '#43352C' }}>
        ¿Querés dejar de recibir avisos de difusión de <strong>{cafeName}</strong>?
      </p>
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full py-3.5 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-85 disabled:opacity-50"
        style={{ background: '#43352C' }}
      >
        {loading ? 'Un momento…' : 'Sí, dejar de recibir'}
      </button>
    </>
  )
}
