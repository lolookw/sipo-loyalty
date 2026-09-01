// Construcción del CSV de clientes de un café. Extraído del route handler para poder
// testearlo directo (mismo patrón que lib/purchase.ts, lib/campaigns.ts, etc.).
export type ExportableLink = {
  stamps: number
  totalStamps: number
  points: number
  totalSpent: number
  createdAt: Date
  customer: {
    name: string
    email: string
    phone: string | null
    birthdate: Date | null
    favoriteDrink: string | null
  }
}

const HEADER = [
  'Nombre', 'Email', 'Teléfono', 'Fecha de nacimiento', 'Café favorito',
  'Sellos actuales', 'Sellos requeridos', 'Sellos totales (histórico)', 'Puntos', 'Total gastado', 'Fecha de alta en el café',
]

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildCustomerCsv(links: ExportableLink[], stampsRequired: number): string {
  const rows = links.map(link => [
    link.customer.name,
    link.customer.email,
    link.customer.phone ?? '',
    link.customer.birthdate ? link.customer.birthdate.toISOString().slice(0, 10) : '',
    link.customer.favoriteDrink ?? '',
    String(link.stamps),
    String(stampsRequired),
    String(link.totalStamps),
    String(link.points),
    link.totalSpent.toFixed(2),
    link.createdAt.toISOString().slice(0, 10),
  ])

  const BOM = '﻿' // Excel necesita el BOM para leer acentos en UTF-8 sin romperlos
  return BOM + [HEADER, ...rows].map(r => r.map(csvField).join(',')).join('\r\n') + '\r\n'
}

// ── Export de superadmin: TODAS las personas de la plataforma, una vez cada una ──────────────
// Distinto del de arriba, que es por café: acá una persona aparece una sola vez aunque esté
// registrada en varias cafeterías, con la lista de cafeterías en una columna.

export type ExportablePerson = {
  name: string
  email: string
  phone: string | null
  birthdate: Date | null
  favoriteDrink: string | null
  createdAt: Date
  cafes: { cafe: { name: string } }[]
}

const PEOPLE_HEADER = [
  'Nombre', 'Email', 'Teléfono', 'Fecha de nacimiento', 'Café favorito',
  'Cantidad de cafeterías', 'Cafeterías', 'Fecha de alta',
]

export function buildPeopleCsv(people: ExportablePerson[]): string {
  const rows = people.map(p => [
    p.name,
    p.email,
    p.phone ?? '',
    p.birthdate ? p.birthdate.toISOString().slice(0, 10) : '',
    p.favoriteDrink ?? '',
    String(p.cafes.length),
    p.cafes.map(c => c.cafe.name).join(' · '),
    p.createdAt.toISOString().slice(0, 10),
  ])

  const BOM = '﻿'
  return BOM + [PEOPLE_HEADER, ...rows].map(r => r.map(csvField).join(',')).join('\r\n') + '\r\n'
}
