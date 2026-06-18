import { prisma } from '@/lib/prisma'
import HubPage from '@/components/HubPage'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const cafes = await prisma.cafe.findMany({
    select: {
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      primaryColor: true,
      coverUrl: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  return <HubPage cafes={cafes} />
}