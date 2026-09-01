import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ShieldCheck, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react'

const PAGE_SIZE = 50

// Listado de personas únicas de TODA la plataforma. A diferencia del contador de cada cafetería,
// acá cada persona aparece UNA sola vez aunque esté registrada en varias cafeterías.
export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'superadmin') redirect('/admin/login')

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = (sp.q ?? '').trim()

  const where = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
    : {}

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      select: {
        id: true, name: true, email: true, createdAt: true,
        cafes: { select: { cafe: { select: { name: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const qs = (p: number) => `?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ''}`

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white">Clientes de la plataforma</h1>
            <p className="text-xs text-zinc-500 truncate">Cada persona una sola vez</p>
          </div>
        </div>
        <Link href="/admin" className="text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
          ← Panel
        </Link>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
            <span className="text-2xl font-bold text-white">{total.toLocaleString('es-AR')}</span>
            {' '}{q ? 'coinciden con la búsqueda' : 'personas registradas en total'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
          {total > 0 && (
            <a
              href={`/api/admin/customers/export${q ? `?q=${encodeURIComponent(q)}` : ''}`}
              className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors"
              title={q ? 'Descarga solo los que coinciden con la búsqueda' : 'Descarga la lista completa'}
            >
              <Download size={13} /> CSV
            </a>
          )}
          <form className="flex items-center gap-2" action="/admin/clientes">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <Search size={13} className="text-zinc-600" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre o email"
                className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none w-52"
              />
            </div>
            <button type="submit" className="text-xs text-zinc-950 bg-amber-500 hover:bg-amber-400 px-3 py-2 rounded-lg font-semibold transition-colors">
              Buscar
            </button>
          </form>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {customers.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-sm">
              {q ? 'Nadie coincide con esa búsqueda.' : 'Todavía no hay clientes registrados.'}
            </div>
          )}

          {customers.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-zinc-800/60 last:border-0">
              <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{c.name}</div>
                <div className="text-xs text-zinc-500 truncate">{c.email}</div>
              </div>
              <div className="hidden sm:flex flex-wrap gap-1 justify-end max-w-[45%]">
                {c.cafes.map(({ cafe }) => (
                  <span key={cafe.slug} className="text-[10px] px-2 py-0.5 rounded-full border bg-zinc-800/60 text-zinc-400 border-zinc-700">
                    {cafe.name}
                  </span>
                ))}
              </div>
              <div className="text-[11px] text-zinc-600 flex-shrink-0 w-20 text-right">
                {c.cafes.length === 1 ? '1 cafetería' : `${c.cafes.length} cafeterías`}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-zinc-800 bg-zinc-950/40">
              <span className="text-xs text-zinc-600">Página {page} de {totalPages}</span>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link href={qs(page - 1)} className="flex items-center gap-1 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors">
                    <ChevronLeft size={12} /> Anterior
                  </Link>
                ) : <span className="flex items-center gap-1 text-xs text-zinc-600 px-2.5 py-1.5"><ChevronLeft size={12} /> Anterior</span>}
                {page < totalPages ? (
                  <Link href={qs(page + 1)} className="flex items-center gap-1 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors">
                    Siguiente <ChevronRight size={12} />
                  </Link>
                ) : <span className="flex items-center gap-1 text-xs text-zinc-600 px-2.5 py-1.5">Siguiente <ChevronRight size={12} /></span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
