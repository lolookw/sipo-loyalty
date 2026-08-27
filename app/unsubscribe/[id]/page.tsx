import { prisma } from '@/lib/prisma'
import UnsubscribeButton from '@/components/UnsubscribeButton'

export default async function UnsubscribePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const link = await prisma.customerCafe.findUnique({
    where: { id },
    select: { marketingOptOut: true, cafe: { select: { name: true } } },
  })

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#FCFBF8' }}>
      <div
        className="w-full max-w-sm rounded-[24px] p-8 text-center"
        style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.06)' }}
      >
        {!link ? (
          <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>Este link no es válido.</p>
        ) : (
          <UnsubscribeButton id={id} cafeName={link.cafe.name} alreadyOptedOut={link.marketingOptOut} />
        )}
      </div>
    </div>
  )
}
