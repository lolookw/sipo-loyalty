'use client'

import { signOut } from 'next-auth/react'
import { LogOut, Coffee } from 'lucide-react'

interface Props {
  cafe: { name: string; slug: string }
  userName: string
}

export default function CajaHeader({ cafe, userName }: Props) {
  return (
    <div className="px-6 py-3.5 flex items-center justify-between" style={{ background: '#1A1310', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(181,106,76,0.15)', border: '1px solid rgba(181,106,76,0.2)' }}
        >
          <Coffee size={14} color="#B56A4C" />
        </div>
        <div>
          <div className="font-sans text-white text-sm font-semibold leading-tight">{cafe.name}</div>
          <div className="font-sans text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{userName} · Cajero</div>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: `/${cafe.slug}/login` })}
        className="font-sans flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: 'rgba(255,255,255,0.35)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'}
      >
        <LogOut size={13} />
        Salir
      </button>
    </div>
  )
}
