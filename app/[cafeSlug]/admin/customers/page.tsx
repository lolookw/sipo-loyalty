import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'

const PAGE_SIZE = 50

export default async function CafeCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ cafeSlug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { cafeSlug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: {
      id: true,
      slug: true,
      stampsRequired: true,
      currencySymbol: true,
      _count: { select: { customers: true } },
      customers: {
        include: { customer: { select: { id: true, name: true, email: true } } },
        orderBy: { totalSpent: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      },
    },
  })

  if (!cafe) return (
    <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>
  )

  const totalCount = cafe._count.customers
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>
            Clientes
          </h1>
          <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
            {totalCount} clientes registrados
          </p>
        </div>
        {totalCount > 0 && (
          <a
            href={`/api/cafe/${cafeSlug}/customers/export`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-medium transition-colors flex-shrink-0"
            style={{ border: '1px solid #E9DED1', color: '#43352C', background: 'white' }}
          >
            <Download size={14} />
            Descargar CSV
          </a>
        )}
      </div>

      <div
        className="rounded-[24px] overflow-hidden"
        style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
      >
        <div
          className="grid grid-cols-5 text-xs font-sans font-semibold uppercase tracking-[0.12em] px-6 py-3.5"
          style={{ color: '#6B6B6B', borderBottom: '1px solid #E9DED1', background: '#FCFBF8' }}
        >
          <div className="col-span-2">Cliente</div>
          <div className="text-center">Sellos</div>
          <div className="text-center">Puntos</div>
          <div className="text-right">Total gastado</div>
        </div>

        {cafe.customers.length === 0 && (
          <div className="text-center py-16" style={{ color: '#C0B4A8' }}>
            <div className="text-3xl mb-2">👥</div>
            <div className="font-sans text-sm">Todavía no hay clientes registrados.</div>
          </div>
        )}

        {cafe.customers.map(({ customer, stamps, points, totalSpent }, i) => (
          <div
            key={customer.id}
            className="grid grid-cols-5 px-6 py-3.5 items-center transition-colors last:border-0 hover:bg-[#FCFBF8]"
            style={{ borderBottom: '1px solid #F6F0E8' }}
          >
            <div className="col-span-2 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-sans font-semibold text-xs flex-shrink-0"
                style={
                  page === 1 && i === 0
                    ? { background: '#43352C', color: 'white' }
                    : { background: '#F6F0E8', color: '#6B6B6B' }
                }
              >
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-sans font-medium text-sm" style={{ color: '#43352C' }}>
                  {customer.name}
                </div>
                <div className="font-sans text-xs" style={{ color: '#6B6B6B' }}>
                  {customer.email}
                </div>
              </div>
            </div>
            <div className="text-center font-sans">
              <span className="text-sm font-semibold" style={{ color: '#43352C' }}>{stamps}</span>
              <span className="text-xs" style={{ color: '#C0B4A8' }}>/{cafe.stampsRequired}</span>
            </div>
            <div className="text-center">
              <span className="font-sans text-sm font-semibold" style={{ color: '#43352C' }}>
                {Math.floor(points).toLocaleString()}
              </span>
            </div>
            <div className="text-right font-sans text-sm font-medium" style={{ color: '#6B6B6B' }}>
              {cafe.currencySymbol}{totalSpent.toLocaleString()}
            </div>
          </div>
        ))}

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: '1px solid #E9DED1', background: '#FCFBF8' }}
          >
            <span className="font-sans text-xs" style={{ color: '#9B9089' }}>
              {from}–{to} de {totalCount}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={`?page=${page - 1}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-sans text-xs font-medium transition-colors"
                  style={{ border: '1px solid #E9DED1', color: '#43352C', background: 'white' }}
                >
                  <ChevronLeft size={13} /> Anterior
                </Link>
              ) : (
                <span
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-sans text-xs font-medium opacity-30"
                  style={{ border: '1px solid #E9DED1', color: '#43352C' }}
                >
                  <ChevronLeft size={13} /> Anterior
                </span>
              )}
              <span className="font-sans text-xs px-1" style={{ color: '#9B9089' }}>
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`?page=${page + 1}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-sans text-xs font-medium transition-colors"
                  style={{ border: '1px solid #E9DED1', color: '#43352C', background: 'white' }}
                >
                  Siguiente <ChevronRight size={13} />
                </Link>
              ) : (
                <span
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-sans text-xs font-medium opacity-30"
                  style={{ border: '1px solid #E9DED1', color: '#43352C' }}
                >
                  Siguiente <ChevronRight size={13} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}