import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCafeIfAuthorized } from '@/lib/cafeAuth'
import { generateApiKey } from '@/lib/apiKeys'
import { apiPlanBlocked } from '@/lib/apiV1'

// Gestión de API keys del café. SOLO dueño o superadmin (los cajeros no ven esto).
const keySelect = { id: true, name: true, prefix: true, active: true, createdAt: true, lastUsedAt: true }

type SessionLike = { user: { id: string; role: string; cafeSlug: string | null } }

async function requireOwnerCafe(cafeId: string, session: SessionLike | null) {
  if (!session?.user?.id || session.user.role === 'cashier') return null
  return getCafeIfAuthorized(cafeId, session)
}

async function requireOwnedKey(id: string, session: SessionLike | null) {
  if (!session?.user?.id || session.user.role === 'cashier') return null
  const key = await prisma.apiKey.findUnique({ where: { id }, include: { cafe: true } })
  if (!key) return null
  if (session.user.role !== 'superadmin' && key.cafe.ownerId !== session.user.id) return null
  return key
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const cafeId = req.nextUrl.searchParams.get('cafeId')
  if (!cafeId) return NextResponse.json({ error: 'Missing cafeId' }, { status: 400 })
  const cafe = await requireOwnerCafe(cafeId, session as SessionLike | null)
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const keys = await prisma.apiKey.findMany({
    where: { cafeId },
    orderBy: { createdAt: 'desc' },
    select: keySelect,
  })
  return NextResponse.json(keys)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const body = await req.json()
  const cafe = await requireOwnerCafe(body.cafeId, session as SessionLike | null)
  if (!cafe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // La API es del plan pago: en prueba/vencido no se crean keys
  const blocked = await apiPlanBlocked(cafe)
  if (blocked) return NextResponse.json({ error: 'La API está disponible con el plan activo. Activá tu plan para crear keys.' }, { status: 403 })

  const name = String(body.name ?? '').trim().slice(0, 60)
  if (!name) return NextResponse.json({ error: 'Falta el nombre de la key' }, { status: 400 })

  const { key, prefix, keyHash } = generateApiKey()
  const created = await prisma.apiKey.create({
    data: { cafeId: cafe.id, name, prefix, keyHash },
    select: keySelect,
  })
  // La clave completa se devuelve UNA sola vez (no queda guardada)
  return NextResponse.json({ apiKey: created, key })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const body = await req.json()
  const key = await requireOwnedKey(String(body.id ?? ''), session as SessionLike | null)
  if (!key) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.apiKey.update({
    where: { id: key.id },
    data: { active: Boolean(body.active) },
    select: keySelect,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const key = await requireOwnedKey(id, session as SessionLike | null)
  if (!key) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.apiKey.delete({ where: { id: key.id } })
  return NextResponse.json({ ok: true })
}
