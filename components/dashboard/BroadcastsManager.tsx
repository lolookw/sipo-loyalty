'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Send, Megaphone } from 'lucide-react'

interface Broadcast {
  id: string
  subject: string
  message: string
  status: string
  totalRecipients: number
  sentCount: number
  createdAt: string
  completedAt: string | null
}

const MAX_SUBJECT = 150
const MAX_MESSAGE = 2000

const inputStyle = { background: '#FCFBF8', border: '1px solid #E9DED1' }

function statusLabel(status: string): string {
  if (status === 'done') return 'Enviada'
  if (status === 'sending') return 'Enviando…'
  return 'En cola'
}

export default function BroadcastsManager({
  cafeSlug, recipientCount, initialBroadcasts,
}: {
  cafeSlug: string
  recipientCount: number
  initialBroadcasts: Broadcast[]
}) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)

  const inFlight = broadcasts.some(b => b.status === 'pending' || b.status === 'sending')

  async function handleConfirmSend() {
    setSending(true)
    try {
      const res = await fetch(`/api/cafe/${cafeSlug}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al crear la difusión'); return }
      setBroadcasts(prev => [{ ...data, createdAt: data.createdAt, completedAt: null }, ...prev])
      setSubject('')
      setMessage('')
      setConfirming(false)
      toast.success('Difusión en cola — se va enviando de a poco en los próximos días')
    } catch { toast.error('Error de conexión') }
    finally { setSending(false) }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>
          Difusión
        </h1>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          Mandá una novedad a los {recipientCount} clientes que no se dieron de baja. Se envía en lotes durante los próximos días, no al instante.
        </p>
      </div>

      <div
        className="rounded-[24px] p-6 mb-6"
        style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
      >
        {inFlight ? (
          <div className="flex items-center gap-3 py-2">
            <Megaphone size={18} color="#B56A4C" />
            <p className="font-sans text-sm" style={{ color: '#43352C' }}>
              Ya hay una difusión en curso. Esperá a que termine de mandarse para componer la próxima.
            </p>
          </div>
        ) : !confirming ? (
          <div className="space-y-4">
            <div>
              <label className="font-sans text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: '#9B9089' }}>
                Asunto
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                maxLength={MAX_SUBJECT}
                placeholder="Ej: Este finde tenemos algo nuevo ☕"
                className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="font-sans text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: '#9B9089' }}>
                Mensaje
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={MAX_MESSAGE}
                rows={5}
                placeholder="Contales la novedad…"
                className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm resize-none"
                style={inputStyle}
              />
            </div>
            <button
              onClick={() => setConfirming(true)}
              disabled={!subject.trim() || !message.trim()}
              className="w-full py-3.5 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-85 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: '#43352C' }}
            >
              <Send size={15} />
              Revisar y enviar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-sans text-sm" style={{ color: '#43352C' }}>
              Se va a mandar a <strong>{recipientCount} clientes</strong>. Esto no se puede deshacer una vez que empieza a salir. ¿Confirmás?
            </p>
            <div className="rounded-xl p-4" style={{ background: '#FCFBF8', border: '1px solid #F6F0E8' }}>
              <p className="font-sans font-semibold text-sm mb-1" style={{ color: '#43352C' }}>{subject}</p>
              <p className="font-sans text-sm whitespace-pre-wrap" style={{ color: '#6B6B6B' }}>{message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="flex-1 py-3 rounded-2xl font-sans text-sm font-medium transition-all disabled:opacity-40"
                style={{ border: '1px solid #E9DED1', color: '#43352C' }}
              >
                Volver a editar
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={sending}
                className="flex-1 py-3 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-85 disabled:opacity-50"
                style={{ background: '#43352C' }}
              >
                {sending ? 'Enviando…' : `Sí, mandar a ${recipientCount}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {broadcasts.length > 0 && (
        <div
          className="rounded-[24px] overflow-hidden"
          style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <div className="px-6 py-3.5" style={{ borderBottom: '1px solid #E9DED1', background: '#FCFBF8' }}>
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#6B6B6B' }}>
              Historial
            </span>
          </div>
          {broadcasts.map(b => (
            <div key={b.id} className="px-6 py-3.5 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid #F6F0E8' }}>
              <div className="min-w-0">
                <p className="font-sans font-medium text-sm truncate" style={{ color: '#43352C' }}>{b.subject}</p>
                <p className="font-sans text-xs" style={{ color: '#9B9089' }}>
                  {new Date(b.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })} · {b.sentCount}/{b.totalRecipients} enviados
                </p>
              </div>
              <span
                className="font-sans text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0"
                style={b.status === 'done'
                  ? { background: '#F6F0E8', color: '#43352C' }
                  : { background: `${'#B56A4C'}14`, color: '#B56A4C' }
                }
              >
                {statusLabel(b.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
