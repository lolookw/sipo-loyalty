import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCafeIfAuthorized } from '@/lib/cafeAuth'
import { executePurchase } from '@/lib/purchase'

// La lógica de negocio vive en lib/purchase.ts, compartida con la API pública /api/v1.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, customerId, cafeId, amount, rewardId } = body

  const cafe = await getCafeIfAuthorized(cafeId, session)
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const result = await executePurchase(prisma, cafe, { type, customerId, amount, rewardId })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ link: result.link, transaction: result.transaction, message: result.message })
}
