'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Check, X } from 'lucide-react'

const inputCls = 'w-16 px-2 py-1 rounded-lg font-sans text-sm text-center outline-none'
const inputStyle = { border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' } as React.CSSProperties

// Acciones del dueño sobre un cliente (ajustar sellos/puntos, eliminarlo del café).
// Solo se renderiza para dueño/superadmin — los cajeros no ven estos botones.
export default function CustomerRowActions({
  cafeSlug, linkId, customerName, stamps, points, stampsRequired, primaryColor,
}: {
  cafeSlug: string
  linkId: string
  customerName: string
  stamps: number
  points: number
  stampsRequired: number
  primaryColor: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formStamps, setFormStamps] = useState(String(stamps))
  const [formPoints, setFormPoints] = useState(String(Math.floor(points)))

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/cafe/${cafeSlug}/customers/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stamps: Number(formStamps), points: Number(formPoints) }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'No pudimos guardar'); return }
      toast.success('Cliente actualizado')
      setEditing(false)
      router.refresh()
    } catch { toast.error('Error de conexión') }
    finally { setBusy(false) }
  }

  async function remove() {
    const ok = confirm(
      `¿Eliminar a ${customerName} de tu cafetería?\n\n` +
      'Se borran sus sellos, puntos e historial de compras en este café y NO se pueden recuperar. ' +
      'Si vuelve, va a tener que registrarse de nuevo desde cero.',
    )
    if (!ok) return
    setBusy(true)
    try {
      const res = await fetch(`/api/cafe/${cafeSlug}/customers/${linkId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || 'No pudimos eliminar'); return }
      toast.success(`${customerName} fue eliminado`)
      router.refresh()
    } catch { toast.error('Error de conexión') }
    finally { setBusy(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <input
          type="number" min={0} max={stampsRequired} value={formStamps}
          onChange={e => setFormStamps(e.target.value)}
          className={inputCls} style={inputStyle} title={`Sellos (0 a ${stampsRequired})`}
        />
        <input
          type="number" min={0} value={formPoints}
          onChange={e => setFormPoints(e.target.value)}
          className={inputCls} style={inputStyle} title="Puntos"
        />
        <button onClick={save} disabled={busy} className="p-1.5 rounded-lg text-white disabled:opacity-40" style={{ background: primaryColor }} title="Guardar">
          <Check size={13} />
        </button>
        <button onClick={() => setEditing(false)} disabled={busy} className="p-1.5 rounded-lg" style={{ color: '#9B9089' }} title="Cancelar">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <button onClick={() => setEditing(true)} disabled={busy} className="p-1.5 rounded-lg transition-colors hover:bg-[#F6F0E8]" style={{ color: '#9B9089' }} title="Ajustar sellos y puntos">
        <Pencil size={13} />
      </button>
      <button onClick={remove} disabled={busy} className="p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ color: '#f87171' }} title="Eliminar cliente">
        <Trash2 size={13} />
      </button>
    </div>
  )
}
