import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toggleSkippedStep, ONBOARDING_STEPS, type OnboardingStepKey } from '@/lib/onboarding'

const VALID_KEYS = new Set(ONBOARDING_STEPS.map(s => s.key))

// POST /api/cafe/[slug]/onboarding/skip — marca/desmarca un paso de la guía de inicio como "no aplica".
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, cafeSlug: sessionSlug } = session.user
  if (role !== 'superadmin' && sessionSlug !== slug)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const step = body?.step as string
  const skipped = Boolean(body?.skipped)
  if (!VALID_KEYS.has(step as OnboardingStepKey))
    return NextResponse.json({ error: 'Paso inválido' }, { status: 400 })

  const cafe = await prisma.cafe.findUnique({ where: { slug }, select: { id: true, onboardingSkippedSteps: true } })
  if (!cafe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = toggleSkippedStep(cafe.onboardingSkippedSteps, step as OnboardingStepKey, skipped)
  await prisma.cafe.update({ where: { id: cafe.id }, data: { onboardingSkippedSteps: updated } })

  return NextResponse.json({ ok: true })
}
