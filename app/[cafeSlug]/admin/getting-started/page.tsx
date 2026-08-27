import { prisma } from '@/lib/prisma'
import { computeOnboarding, type OnboardingFacts } from '@/lib/onboarding'
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist'

const DEFAULT_STAMPS_REQUIRED = 10
const DEFAULT_STAMP_REWARD = '1 free coffee'
const DEFAULT_PRIMARY_COLOR = '#6F4E37'
const DEFAULT_ACCENT_COLOR = '#D4A96A'

export default async function GettingStartedPage({
  params,
}: {
  params: Promise<{ cafeSlug: string }>
}) {
  const { cafeSlug } = await params

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    select: {
      id: true, slug: true,
      logoUrl: true, primaryColor: true, accentColor: true,
      menuUrl: true, mapsUrl: true, instagramUrl: true, whatsappUrl: true, websiteUrl: true,
      stampsRequired: true, stampReward: true,
      onboardingSeenAt: true, onboardingSkippedSteps: true,
      _count: { select: { rewards: true, staff: true } },
    },
  })

  if (!cafe) return (
    <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>
  )

  // Primera visita: marca la guía como vista para apagar el aviso del sidebar.
  if (!cafe.onboardingSeenAt) {
    await prisma.cafe.update({ where: { id: cafe.id }, data: { onboardingSeenAt: new Date() } })
  }

  const facts: OnboardingFacts = {
    hasLogo: !!cafe.logoUrl,
    hasCustomColors: cafe.primaryColor !== DEFAULT_PRIMARY_COLOR || cafe.accentColor !== DEFAULT_ACCENT_COLOR,
    hasContactLink: !!(cafe.menuUrl || cafe.mapsUrl || cafe.instagramUrl || cafe.whatsappUrl || cafe.websiteUrl),
    hasCustomStampConfig: cafe.stampsRequired !== DEFAULT_STAMPS_REQUIRED || cafe.stampReward !== DEFAULT_STAMP_REWARD,
    hasRewards: cafe._count.rewards > 0,
    hasStaff: cafe._count.staff > 0,
  }

  const { steps, doneCount, total, allDone } = computeOnboarding(facts, cafe.onboardingSkippedSteps)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>
          Guía de inicio
        </h1>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          {allDone
            ? 'Ya configuraste todo lo básico. Podés volver acá cuando quieras.'
            : `${doneCount}/${total} pasos listos — lo que no aplique, lo podés saltear.`}
        </p>
      </div>

      <OnboardingChecklist cafeSlug={cafe.slug} steps={steps} />
    </div>
  )
}
