import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiCafe, apiBalance } from '@/lib/apiV1'
import { searchCafeCustomers } from '@/lib/customerSearch'

// GET /api/v1/customers/search?q=xxx — autocomplete de clientes del café (para integraciones de
// caja/ERP, ej. el buscador de la extensión de Restolia). Mismo criterio que el buscador interno
// del panel (/api/customer?search=): nombre o inicio de email, mínimo 2 caracteres, hasta 6.
export async function GET(req: NextRequest) {
  const auth = await requireApiCafe(req)
  if (auth instanceof NextResponse) return auth
  const { cafe } = auth

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const customers = await searchCafeCustomers(prisma, cafe.id, q)

  return NextResponse.json({
    customers: customers
      .filter(c => c.cafes[0])
      .map(c => ({
        email: c.email,
        name: c.name,
        loyalty: apiBalance(c.cafes[0], cafe),
      })),
  })
}
