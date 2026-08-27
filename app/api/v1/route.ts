import { NextResponse } from 'next/server'

// GET /api/v1 — índice público de la API (sin auth)
export async function GET() {
  return NextResponse.json({
    name: 'Sipo API',
    version: 'v1',
    docs: 'https://sipo.ar/developers',
    auth: 'Authorization: Bearer sipo_live_… (se crea en Configuración → Integraciones del panel del café)',
    endpoints: {
      'GET /api/v1/me': 'Datos y configuración del café de la key',
      'GET /api/v1/customers?email=': 'Cliente y su balance en el café',
      'GET /api/v1/customers/search?q=': 'Autocomplete por nombre o email (2+ chars, hasta 6)',
      'POST /api/v1/customers': 'Alta de cliente { email, name }',
      'POST /api/v1/purchases': 'Registrar compra { email, amount?, mode?, auto_register?, name? }',
      'POST /api/v1/redemptions': 'Canjear { email, type: "stamp"|"reward", rewardId? }',
    },
  })
}
