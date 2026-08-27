import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_SUBJECT_LEN = 150
const MAX_MESSAGE_LEN = 2000

function requireCafeAccess(session: { user?: { role?: string; cafeSlug?: string | null } } | null, slug: string) {
  if (!session?.user) return { ok: false as const, status: 401, error: 'Unauthorized' }
  if (session.user.role !== 'superadmin' && session.user.cafeSlug !== slug)
    return { ok: false as const, status: 403, error: 'Forbidden' }
  return { ok: true as const }
}

// GET /api/cafe/[slug]/broadcasts — historial de difusiones del café (para la página de admin).
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  const access = requireCafeAccess(session, slug)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const cafe = await prisma.cafe.findUnique({ where: { slug }, select: { id: true } })
  if (!cafe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const broadcasts = await prisma.broadcast.findMany({
    where: { cafeId: cafe.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json(broadcasts)
}

// POST /api/cafe/[slug]/broadcasts — compone una difusión nueva. NO envía nada acá: solo crea el
// Broadcast + la cola de destinatarios (no opt-out al momento de componer). El envío real lo hace
// el cron en lotes (ver /api/cron/stamps) para respetar la cuota de Resend compartida por toda la
// plataforma.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  const access = requireCafeAccess(session, slug)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const cafe = await prisma.cafe.findUnique({ where: { slug }, select: { id: true } })
  if (!cafe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const subject = String(body?.subject ?? '').trim()
  const message = String(body?.message ?? '').trim()
  if (!subject || subject.length > MAX_SUBJECT_LEN)
    return NextResponse.json({ error: 'Asunto inválido' }, { status: 400 })
  if (!message || message.length > MAX_MESSAGE_LEN)
    return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 })

  // No dejamos apilar difusiones: mientras una siga en curso para este café, no se puede crear otra.
  const inFlight = await prisma.broadcast.findFirst({ where: { cafeId: cafe.id, status: { in: ['pending', 'sending'] } } })
  if (inFlight) return NextResponse.json({ error: 'Ya hay una difusión en curso para este café' }, { status: 409 })

  const recipients = await prisma.customerCafe.findMany({
    where: { cafeId: cafe.id, marketingOptOut: false },
    select: { customerId: true },
  })
  if (recipients.length === 0)
    return NextResponse.json({ error: 'No hay clientes para recibir esta difusión (todos se dieron de baja)' }, { status: 400 })

  const broadcast = await prisma.$transaction(async tx => {
    const created = await tx.broadcast.create({
      data: { cafeId: cafe.id, subject, message, totalRecipients: recipients.length },
    })
    await tx.broadcastRecipient.createMany({
      data: recipients.map(r => ({ broadcastId: created.id, customerId: r.customerId })),
    })
    return created
  })

  return NextResponse.json(broadcast)
}
