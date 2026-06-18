'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export default function SuperAdminSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/admin/login' })}
      className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      <LogOut size={14} />
      Salir
    </button>
  )
}
