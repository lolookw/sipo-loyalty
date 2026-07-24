import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sipo — API para integraciones',
  description: 'Conectá tu caja o ERP gastronómico con el programa de fidelidad de tu cafetería.',
}

const BASE = 'https://sipo.ar/api/v1'

function Code({ children }: { children: string }) {
  return (
    <pre
      className="rounded-2xl p-5 text-sm overflow-x-auto font-mono leading-relaxed"
      style={{ background: '#1A1310', color: '#F6F0E8' }}
    >
      {children}
    </pre>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif font-medium mt-12 mb-3" style={{ fontSize: '1.6rem', color: '#43352C' }}>{children}</h2>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-[15px] leading-relaxed mb-4" style={{ color: '#6B6B6B' }}>{children}</p>
}

export default function DevelopersPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FCFBF8' }}>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="font-sans text-xs uppercase tracking-widest font-medium mb-2" style={{ color: '#9B9089' }}>
          Para desarrolladores
        </div>
        <h1 className="font-serif font-medium mb-4" style={{ fontSize: '2.4rem', color: '#43352C' }}>
          Sipo API <span style={{ color: '#B56A4C' }}>v1</span>
        </h1>
        <P>
          Conectá tu sistema de caja o ERP gastronómico con el programa de fidelidad de tu cafetería:
          registrá compras, consultá balances y canjeá premios. Los sellos, puntos, campañas y
          referidos se aplican solos, con las mismas reglas que la caja de Sipo.
        </P>

        <H2>Autenticación</H2>
        <P>
          La API está disponible para <strong>cafeterías con plan activo</strong> (no en el período de
          prueba). Creá una API key desde el panel del café: <strong>Configuración → Integraciones (API)</strong>.
          La clave se muestra una sola vez. Mandala en cada request:
        </P>
        <Code>{`Authorization: Bearer sipo_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
        <P>Cada key pertenece a un café: la API solo opera sobre los clientes de ese café.</P>

        <H2>Registrar una compra</H2>
        <P>
          El caso principal: tu POS cierra una venta y la informa. Con <code>mode: &quot;auto&quot;</code>{' '}
          Sipo decide (puntos si están activos y hay monto; si no, un sello). Si el email todavía no
          es cliente del café, mandá <code>auto_register: true</code>.
        </P>
        <Code>{`curl -X POST ${BASE}/purchases \\
  -H "Authorization: Bearer $SIPO_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "cliente@gmail.com",
    "amount": 8200,
    "mode": "auto",
    "auto_register": true,
    "external_id": "restolia-ticket-8841"
  }'

# → 200
{
  "transaction": { "id": "…", "type": "points_add", "points": 8200, … },
  "balance": { "stamps": 3, "stamps_required": 8, "points": 12400, … },
  "message": "+8200 puntos ganados.",
  "campaign_applied": false,
  "referral_converted": false
}`}</Code>

        <H2>Idempotencia</H2>
        <P>
          Mandá siempre <code>external_id</code> (el ID del ticket/venta en tu sistema). Si el mismo
          ID llega dos veces —reintento de red, doble click— la segunda vez NO se acredita de nuevo:
          respondemos <code>duplicate: true</code> con la transacción original. Vale también en
          <code> /redemptions</code>.
        </P>

        <H2>Consultar un cliente</H2>
        <P>Con <code>&amp;include=transactions</code> devuelve además las últimas 10 transacciones.</P>
        <Code>{`curl "${BASE}/customers?email=cliente@gmail.com" \\
  -H "Authorization: Bearer $SIPO_KEY"

# → 200
{
  "customer": { "email": "cliente@gmail.com", "name": "Ana" },
  "loyalty": {
    "stamps": 3, "stamps_required": 8, "stamp_reward": "1 café gratis",
    "points": 12400, "bonus_points": 0, "stamps_expire_at": null
  }
}`}</Code>

        <H2>Dar de alta un cliente</H2>
        <Code>{`curl -X POST ${BASE}/customers \\
  -H "Authorization: Bearer $SIPO_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "cliente@gmail.com", "name": "Ana" }'`}</Code>

        <H2>Canjear un premio</H2>
        <P>
          Tarjeta de sellos completa (<code>type: &quot;stamp&quot;</code>) o un premio de puntos
          (<code>type: &quot;reward&quot;</code> + <code>rewardId</code> — los IDs salen de <code>GET /me</code>).
        </P>
        <Code>{`curl -X POST ${BASE}/redemptions \\
  -H "Authorization: Bearer $SIPO_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "cliente@gmail.com", "type": "stamp" }'`}</Code>

        <H2>Configuración del café</H2>
        <Code>{`curl ${BASE}/me -H "Authorization: Bearer $SIPO_KEY"`}</Code>

        <H2>Errores</H2>
        <P>Siempre JSON con código y mensaje. Los importantes:</P>
        <Code>{`401 { "error": { "code": "invalid_api_key" } }
404 { "error": { "code": "customer_not_found" } }
403 { "error": { "code": "plan_limit_reached" } }
400 { "error": { "code": "purchase_failed", "message": "Tarjeta completa…" } }
409 { "error": { "code": "purchase_failed", "message": "Hubo actividad simultánea…" } }`}</Code>

        <div className="mt-16 pt-8 font-sans text-sm" style={{ borderTop: '1px solid #E9DED1', color: '#9B9089' }}>
          ¿Integrás un ERP y te falta algo? Escribinos — Sipo · Cada café cuenta ☕
        </div>
      </div>
    </div>
  )
}
