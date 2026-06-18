import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCafeIfAuthorized } from '@/lib/cafeAuth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, customerId, cafeId, amount, rewardId } = body
  const parsedAmount = typeof amount === 'number' ? amount : Number(amount)
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0

  const cafe = await getCafeIfAuthorized(cafeId, session)
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Validate customer exists before operating
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  })
  if (!customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  // Get or create customer-cafe link
  const link = await prisma.customerCafe.upsert({
    where: { customerId_cafeId: { customerId, cafeId } },
    update: {},
    create: { customerId, cafeId },
  })

  type TransactionData = {
    type: string
    customerId: string
    cafeId: string
    amount?: number
    stamps?: number
    points?: number
    note?: string
  }

  let txData: TransactionData = { type, customerId, cafeId }
  let pointsRedeemedRewardName = ''

  if (type === 'stamp_add') {
    if (cafe.minPurchaseForStamp > 0) {
      if (!hasValidAmount)
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      if (parsedAmount < cafe.minPurchaseForStamp)
        return NextResponse.json({ error: `Minimum purchase for stamp is ${cafe.currencySymbol}${cafe.minPurchaseForStamp}` }, { status: 400 })
    }

    txData = {
      ...txData,
      ...(hasValidAmount ? { amount: parsedAmount } : {}),
      stamps: 1,
      note: 'Stamp added',
    }

  } else if (type === 'stamp_redeem') {
    txData = { ...txData, stamps: -cafe.stampsRequired, note: `Redeemed: ${cafe.stampReward}` }

  } else if (type === 'points_add') {
    if (!hasValidAmount)
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    const pointsEarned = Math.floor(parsedAmount * cafe.pointsPerPeso)
    txData = { ...txData, amount: parsedAmount, points: pointsEarned, note: `Purchase ${cafe.currencySymbol}${parsedAmount}` }

  } else if (type === 'points_redeem') {
    if (!rewardId) return NextResponse.json({ error: 'No reward specified' }, { status: 400 })
    const reward = await prisma.reward.findFirst({ where: { id: rewardId, cafeId, active: true } })
    if (!reward) return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    pointsRedeemedRewardName = reward.name
    txData = { ...txData, points: -reward.pointsCost, note: `Redeemed: ${reward.name}` }

  } else {
    return NextResponse.json({ error: 'Unknown transaction type' }, { status: 400 })
  }

  const transactionResult = await prisma.$transaction(async db => {
    if (type === 'stamp_add') {
      const result = await db.customerCafe.updateMany({
        where: { id: link.id, stamps: { lt: cafe.stampsRequired } },
        data: { stamps: { increment: 1 }, totalStamps: { increment: 1 } },
      })
      if (result.count === 0) throw new Error('STAMP_CARD_FULL')

    } else if (type === 'stamp_redeem') {
      const result = await db.customerCafe.updateMany({
        where: { id: link.id, stamps: { gte: cafe.stampsRequired } },
        data: { stamps: 0 },
      })
      if (result.count === 0) throw new Error('NOT_ENOUGH_STAMPS')

    } else if (type === 'points_add') {
      const result = await db.customerCafe.updateMany({
        where: { id: link.id },
        data: { points: { increment: txData.points ?? 0 }, totalSpent: { increment: parsedAmount } },
      })
      if (result.count === 0) throw new Error('CUSTOMER_LINK_NOT_FOUND')

    } else if (type === 'points_redeem') {
      const pointsCost = Math.abs(txData.points ?? 0)
      const result = await db.customerCafe.updateMany({
        where: { id: link.id, points: { gte: pointsCost } },
        data: { points: { decrement: pointsCost } },
      })
      if (result.count === 0) throw new Error('NOT_ENOUGH_POINTS')
    }

    const [updatedLink, tx] = await Promise.all([
      db.customerCafe.findUniqueOrThrow({ where: { id: link.id } }),
      db.transaction.create({ data: txData }),
    ])

    return { updatedLink, tx }
  }).catch(error => {
    if (error instanceof Error) {
      if (error.message === 'STAMP_CARD_FULL')
        return NextResponse.json({ error: 'Tarjeta completa, primero canjear.' }, { status: 400 })
      if (error.message === 'NOT_ENOUGH_STAMPS')
        return NextResponse.json({ error: 'Not enough stamps' }, { status: 400 })
      if (error.message === 'NOT_ENOUGH_POINTS')
        return NextResponse.json({ error: 'Not enough points' }, { status: 400 })
    }
    throw error
  })

  if (transactionResult instanceof NextResponse) return transactionResult

  const { updatedLink, tx } = transactionResult

  // Build message using actual post-update values
  let message = ''
  if (type === 'stamp_add') {
    message = updatedLink.stamps >= cafe.stampsRequired
      ? `🎉 ¡Tarjeta completa! Podés canjear ${cafe.stampReward}.`
      : `Sello ${updatedLink.stamps}/${cafe.stampsRequired} agregado.`
  } else if (type === 'stamp_redeem') {
    message = `✅ Recompensa canjeada: ${cafe.stampReward}`
  } else if (type === 'points_add') {
    message = `+${txData.points} puntos ganados.`
  } else if (type === 'points_redeem') {
    message = `✅ Recompensa canjeada: ${pointsRedeemedRewardName}`
  }

  return NextResponse.json({ link: updatedLink, transaction: tx, message })
}
