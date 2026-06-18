import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function CustomersPage() {
  const session = await getServerSession(authOptions)
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: session!.user!.id as string },
    include: {
      customers: {
        include: { customer: true },
        orderBy: { totalSpent: 'desc' },
      },
    },
  })

  if (!cafe) return <div className="p-8 text-zinc-400">No café found.</div>

  const primary = cafe.primaryColor
  const accent = cafe.accentColor

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-1">Clientes</h1>
        <p className="text-zinc-400 text-sm">{cafe.customers.length} clientes registrados</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="grid grid-cols-5 text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3 border-b border-zinc-100">
          <div className="col-span-2">Cliente</div>
          <div className="text-center">Sellos</div>
          <div className="text-center">Puntos</div>
          <div className="text-right">Total gastado</div>
        </div>

        {cafe.customers.length === 0 && (
          <div className="text-center py-16 text-zinc-300">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-sm">Todavía no hay clientes registrados.</div>
          </div>
        )}

        {cafe.customers.map(({ customer, stamps, points, totalSpent }, i) => (
          <div
            key={customer.id}
            className="grid grid-cols-5 px-6 py-3.5 border-b border-zinc-50 hover:bg-zinc-50 transition-colors items-center last:border-0"
          >
            <div className="col-span-2 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs flex-shrink-0"
                style={
                  i === 0
                    ? { background: primary, color: 'white' }
                    : { background: '#f4f4f5', color: '#71717a' }
                }
              >
                {customer.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-sm text-zinc-800">{customer.name}</div>
                <div className="text-xs text-zinc-400">{customer.email}</div>
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-zinc-800">{stamps}</span>
              <span className="text-xs text-zinc-300">/{cafe.stampsRequired}</span>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-zinc-800">{Math.floor(points).toLocaleString()}</span>
            </div>
            <div className="text-right text-sm text-zinc-600 font-medium">
              {cafe.currencySymbol}{totalSpent.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
