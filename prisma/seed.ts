// Dev seed — creates the Café Demo for local development.
// Same data as scripts/setup-demo-cafe.ts so both envs stay in sync.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('sipoDemo25', 10)

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
          { name: 'Café gratis',       description: 'Un café de tu elección',     pointsCost: 15000, emoji: '☕' },
          { name: '10% de descuento',  description: 'En tu próxima compra',       pointsCost: 12000, emoji: '🏷️' },
          { name: 'Medialunas x4',     description: 'Cuatro medialunas frescas',  pointsCost: 20000, emoji: '🥐' },
          { name: 'Torta del día',     description: 'La torta del mostrador',     pointsCost: 38000, emoji: '🎂' },
        ],
      },
    },
  })

  console.log(`✅ Seeded: ${cafe.name} (/${cafe.slug})`)
  console.log(`   Login: demo@sipo.ar / sipoDemo25`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
