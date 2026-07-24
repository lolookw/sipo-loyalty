import { Users, UserPlus, Repeat, Wallet, Gift } from 'lucide-react'

interface Props {
  currencySymbol: string
  kpis: { totalCustomers: number; newCustomers30: number; recurring: number; revenue30: number; redemptions: number }
  weekly: { label: string; count: number }[]
  hourly: { hour: number; count: number }[]
}

const ESPRESSO = '#43352C'
const TERRACOTA = '#B56A4C'
const MUTED = '#6B6B6B'
const FAINT = '#C0B4A8'
const BORDER = '#E9DED1'

const cardStyle: React.CSSProperties = { background: 'white', border: `1px solid ${BORDER}`, boxShadow: '0 4px 16px rgba(67,53,44,0.03)' }

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-[20px] p-4" style={cardStyle}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} style={{ color: MUTED }} />
        <span className="font-sans text-xs font-medium" style={{ color: MUTED }}>{label}</span>
      </div>
      <div className="font-sans text-2xl font-bold tracking-tight" style={{ color: ESPRESSO }}>{value}</div>
    </div>
  )
}

/** Barras verticales de una sola serie (terracota). El pico se etiqueta y se resalta. */
function BarChart({ data, height = 140 }: { data: { label: string; count: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const total = data.reduce((a, d) => a + d.count, 0)
  const peakIdx = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0)

  if (total === 0) {
    return <div className="flex items-center justify-center font-sans text-sm" style={{ height, color: FAINT }}>Todavía no hay actividad en este período.</div>
  }

  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((d, i) => {
        const isPeak = i === peakIdx && d.count > 0
        const h = d.count === 0 ? 2 : Math.max(4, Math.round((d.count / max) * (height - 22)))
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.label}: ${d.count}`}>
            {isPeak && <div className="font-sans text-[10px] font-semibold mb-1" style={{ color: ESPRESSO }}>{d.count}</div>}
            <div
              className="w-full rounded-t-[4px] transition-opacity hover:opacity-80"
              style={{ height: h, background: isPeak ? ESPRESSO : TERRACOTA, opacity: d.count === 0 ? 0.25 : 1, minWidth: 3 }}
            />
          </div>
        )
      })}
    </div>
  )
}

function AxisLabels({ labels }: { labels: string[] }) {
  return (
    <div className="flex gap-[2px] mt-1.5">
      {labels.map((l, i) => (
        <div key={i} className="flex-1 text-center font-sans" style={{ fontSize: 9, color: FAINT }}>{l}</div>
      ))}
    </div>
  )
}

export default function AnalyticsDashboard({ currencySymbol, kpis, weekly, hourly }: Props) {
  // Etiquetas de hora cada 3h para no saturar
  const hourLabels = hourly.map(h => (h.hour % 3 === 0 ? `${h.hour}h` : ''))

  return (
    <div className="px-6 sm:px-8 py-8 max-w-3xl mx-auto">
      <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.6rem', color: ESPRESSO }}>Estadísticas</h1>
      <p className="font-sans text-sm mb-6" style={{ color: MUTED }}>El pulso de tu cafetería.</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatTile icon={Users} label="Clientes" value={kpis.totalCustomers.toLocaleString('es-AR')} />
        <StatTile icon={UserPlus} label="Nuevos (30d)" value={kpis.newCustomers30.toLocaleString('es-AR')} />
        <StatTile icon={Repeat} label="Recurrentes" value={kpis.recurring.toLocaleString('es-AR')} />
        <StatTile icon={Wallet} label="Facturado (30d)" value={`${currencySymbol}${kpis.revenue30.toLocaleString('es-AR')}`} />
        <StatTile icon={Gift} label="Premios canjeados" value={kpis.redemptions.toLocaleString('es-AR')} />
      </div>

      {/* Actividad por semana */}
      <div className="rounded-[24px] p-5 sm:p-6 mb-5" style={cardStyle}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-sans font-semibold text-sm" style={{ color: ESPRESSO }}>Actividad por semana</h2>
          <span className="font-sans text-xs" style={{ color: FAINT }}>últimas 8 semanas</span>
        </div>
        <BarChart data={weekly} />
        <AxisLabels labels={weekly.map(w => w.label)} />
      </div>

      {/* Horas pico */}
      <div className="rounded-[24px] p-5 sm:p-6" style={cardStyle}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-sans font-semibold text-sm" style={{ color: ESPRESSO }}>Horas del día</h2>
          <span className="font-sans text-xs" style={{ color: FAINT }}>últimos 90 días · hora local</span>
        </div>
        <BarChart data={hourly.map(h => ({ label: `${h.hour}h`, count: h.count }))} />
        <AxisLabels labels={hourLabels} />
      </div>
    </div>
  )
}
