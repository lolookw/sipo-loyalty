import { prisma } from '@/lib/prisma'
import { getEffectivePlan, isServiceLimited } from '@/lib/planStatus'
import { getPlatformConfig } from '@/lib/platformConfig'
import { getPlanTiers } from '@/lib/planTiers'
import BillingSection from '@/components/dashboard/BillingSection'
import ApiKeysManager from '@/components/dashboard/ApiKeysManager'

export default async function FacturacionPage({ params }: { params: Promise<{ cafeSlug: string }> }) {
  const { cafeSlug } = await params

  const cafe = await prisma.cafe.findUnique({
    where: { slug: cafeSlug },
    include: { owner: { select: { email: true } } },
  })
  if (!cafe) return <div className="p-8 font-sans text-sm" style={{ color: '#6B6B6B' }}>Cafetería no encontrada.</div>

  // La API es un beneficio del plan pago (en prueba/vencido no se ofrece).
  const { graceDays } = await getPlatformConfig()
  const tiers = await getPlanTiers()
  const apiAllowed = !isServiceLimited(getEffectivePlan(cafe, graceDays))

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>
          Plan y facturación
        </h1>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>
          Tu plan, los pagos y las claves de la API.
        </p>
      </div>

      <div className="space-y-4">
        <div
          className="rounded-[24px] p-6"
          style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <h2
            className="font-sans text-sm font-semibold tracking-tight mb-5 pb-4"
            style={{ color: '#43352C', borderBottom: '1px solid #F6F0E8' }}
          >
            Facturación
          </h2>
          <BillingSection
            cafeSlug={cafe.slug}
            planTier={cafe.planTier}
            pendingSubscriptionTier={cafe.pendingSubscriptionTier}
            mpPreapprovalId={cafe.mpPreapprovalId}
            mpPreapprovalStatus={cafe.mpPreapprovalStatus}
            activeUntil={cafe.activeUntil ? new Date(cafe.activeUntil).toISOString() : null}
            planChangeRequestedTier={cafe.planChangeRequestedTier}
            tiers={tiers}
            mpPayerEmail={cafe.mpPayerEmail}
            ownerEmail={cafe.owner.email}
            mpSubscriptionAmount={cafe.mpSubscriptionAmount}
            pendingBillingSyncAt={cafe.pendingBillingSyncAt ? new Date(cafe.pendingBillingSyncAt).toISOString() : null}
            primaryColor={cafe.primaryColor}
          />
        </div>

        <div
          className="rounded-[24px] p-6"
          style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <h2
            className="font-sans text-sm font-semibold tracking-tight mb-5 pb-4"
            style={{ color: '#43352C', borderBottom: '1px solid #F6F0E8' }}
          >
            Integraciones (API)
          </h2>
          <ApiKeysManager cafeId={cafe.id} primaryColor={cafe.primaryColor} apiAllowed={apiAllowed} />
        </div>
      </div>
    </div>
  )
}
