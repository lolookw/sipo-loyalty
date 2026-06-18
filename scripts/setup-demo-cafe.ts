/**
 * Creates or updates the Sipo demo café.
 * Usage: DEMO_OWNER_PASSWORD=<strong-password> npx tsx scripts/setup-demo-cafe.ts
 *
 * Never hard-code or print production demo credentials.
 * URL: sipo.ar/cafedemo
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const demoPassword = process.env.DEMO_OWNER_PASSWORD
  if (!demoPassword) {
    throw new Error('DEMO_OWNER_PASSWORD is required')
  }

  const hashedPassword = await bcrypt.hash(demoPassword, 10)

  const owner = await prisma.owner.upsert({
    where: { email: 'demo@sipo.ar' },
    update: { password: hashedPassword, name: 'Café Demo' },
    create: {
      email: 'demo@sipo.ar',
      name: 'Café Demo',
      password: hashedPassword,
    },
  })

  const cafe = await prisma.cafe.upsert({
    where: { slug: 'cafedemo' },
    update: {},
    create: {
      slug: 'cafedemo',
      name: 'Café Demo',
      description: 'Un café de ejemplo para explorar el panel de Sipo.',
      primaryColor: '#B56A4C',
      accentColor: '#D9C7B2',
      stampsRequired: 8,
      stampReward: '1 café gratis',
      pointsPerPeso: 1,
      currencySymbol: '$',
      menuUrl: 'https://sipo.ar/demo',
      instagramUrl: 'https://instagram.com',
      ownerId: owner.id,
      rewards: {
        create: [
          { name: 'Café gratis',        description: 'Un café de tu elección',     pointsCost: 500, emoji: '☕' },
          { name: '10% de descuento',   description: 'En tu próxima compra',       pointsCost: 200, emoji: '🏷️' },
          { name: 'Medialunas x4',      description: 'Cuatro medialunas frescas',  pointsCost: 300, emoji: '🥐' },
        ],
      },
    },
  })

  console.log(`✅ Demo café listo: ${cafe.name} (sipo.ar/${cafe.slug})`)
  console.log(`   Login email: demo@sipo.ar`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
