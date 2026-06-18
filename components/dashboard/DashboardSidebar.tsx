'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, Settings, Users, Gift, LogOut, Coffee, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  cafes: { id: string; slug: string; name: string; primaryColor: string }[]
  ownerName: string
}

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/customers', label: 'Clientes', icon: Users },
  { href: '/dashboard/rewards', label: 'Recompensas', icon: Gift },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

export default function DashboardSidebar({ cafes, ownerName }: Props) {
  const pathname = usePathname()
  const cafe = cafes[0]

  const sidebarBg    = '#1A1310'
  const borderColor  = 'rgba(255,255,255,0.07)'
  const mutedText    = 'rgba(255,255,255,0.35)'
  const hoverBg      = 'rgba(255,255,255,0.06)'
  const activeBg     = 'rgba(255,255,255,0.10)'

  return (
    <aside className="w-56 min-h-screen flex flex-col sticky top-0" style={{ background: sidebarBg }}>
      <div className="px-5 py-5" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(181,106,76,0.15)', border: '1px solid rgba(181,106,76,0.2)' }}
          >
            <Coffee size={14} color="#B56A4C" />
          </div>
          <div className="min-w-0">
            <div className="font-sans font-semibold text-sm text-white tracking-tight truncate">
              {cafe?.name || 'Sipo'}
            </div>
            <div className="font-sans text-xs truncate" style={{ color: mutedText }}>{ownerName}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans font-medium transition-all duration-150"
              style={active
                ? { background: activeBg, color: 'white' }
                : { color: 'rgba(255,255,255,0.5)' }
              }
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = hoverBg; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)' }}}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}

        <div className="pt-3 mt-1 space-y-0.5" style={{ borderTop: `1px solid ${borderColor}` }}>
          {cafe && (
            <a
              href={`/${cafe.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans font-medium transition-all duration-150"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }}
            >
              <ExternalLink size={15} />
              Ver mi página
            </a>
          )}
        </div>
      </nav>

      <div className="px-3 py-4" style={{ borderTop: `1px solid ${borderColor}` }}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans font-medium w-full transition-all duration-150"
          style={{ color: mutedText }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = mutedText }}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
