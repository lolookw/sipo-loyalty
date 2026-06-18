import {
  LayoutDashboard, Users, Gift, Settings, Coffee, LogOut,
  Star, Plus, Check, ArrowLeft, UserRound, Save,
} from 'lucide-react'

// ── Design tokens (Café Demo palette) ─────────────────────────
const P  = '#B56A4C'  // primary
const SB = '#1A1310'  // sidebar bg
const BG = '#FCFBF8'  // page bg
const BD = '#E9DED1'  // border
const TM = '#43352C'  // text main
const TT = '#6B6B6B'  // text muted
const TF = '#9B9089'  // text faint
const IB = '#F6F0E8'  // input bg

// ── Shared: browser chrome ─────────────────────────────────────
function BrowserBar({ url }: { url: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-2 flex-shrink-0"
      style={{ background: '#e4dbd4', borderBottom: `1px solid #ccc3bb` }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#ff5f57' }} />
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#ffbc2e' }} />
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#28c840' }} />
      <div className="flex-1 mx-2">
        <div
          className="text-[9px] font-sans px-2 py-0.5 rounded flex items-center gap-1"
          style={{ background: 'white', color: TF, border: '1px solid #ccc3bb' }}
        >
          <span style={{ opacity: 0.5 }}>🔒</span>
          {url}
        </div>
      </div>
    </div>
  )
}

// ── Shared: dashboard sidebar ──────────────────────────────────
type STab = 'inicio' | 'clientes' | 'recompensas' | 'config'

function Sidebar({ active }: { active: STab }) {
  const items: { key: STab; label: string; Icon: React.ElementType }[] = [
    { key: 'inicio',       label: 'Inicio',          Icon: LayoutDashboard },
    { key: 'clientes',     label: 'Clientes',        Icon: Users           },
    { key: 'recompensas',  label: 'Recompensas',     Icon: Gift            },
    { key: 'config',       label: 'Configuración',   Icon: Settings        },
  ]
  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ width: 100, background: SB, borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="px-2.5 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(181,106,76,0.18)' }}
          >
            <Coffee size={9} color="#B56A4C" />
          </div>
          <span className="font-sans font-semibold text-[10px] text-white leading-tight truncate">Café Demo</span>
        </div>
        <div className="font-sans text-[9px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>demo@sipo.ar</div>
      </div>

      <nav className="flex-1 px-1.5 py-2 space-y-0.5">
        {items.map(({ key, label, Icon }) => (
          <div
            key={key}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-sans"
            style={active === key
              ? { background: 'rgba(255,255,255,0.10)', color: 'white' }
              : { color: 'rgba(255,255,255,0.45)' }
            }
          >
            <Icon size={10} />
            {label}
          </div>
        ))}
      </nav>

      <div className="px-1.5 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6 }}>
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-sans"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <LogOut size={10} />
          Salir
        </div>
      </div>
    </div>
  )
}

// ── Admin screenshot ───────────────────────────────────────────
export function AdminScreenshot() {
  return (
    <div
      className="w-full rounded-[12px] overflow-hidden"
      style={{ border: '1px solid #ccc3bb', boxShadow: '0 20px 60px rgba(67,53,44,0.18)', background: BG }}
    >
      <BrowserBar url="sipo.ar/dashboard/settings" />

      <div className="flex" style={{ minHeight: 380 }}>
        <Sidebar active="config" />

        {/* Content */}
        <div className="flex-1 overflow-auto p-4" style={{ background: BG }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-serif font-medium text-sm" style={{ color: TM }}>Configuración</div>
              <div className="font-sans text-[9px]" style={{ color: TF }}>sipo.ar/cafedemo</div>
            </div>
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[10px] font-sans font-semibold"
              style={{ background: P }}
            >
              <Save size={9} /> Guardar
            </button>
          </div>

          {/* Loyalty program section */}
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: 'white', border: `1px solid ${BD}` }}
          >
            <div
              className="font-sans text-[10px] font-semibold pb-2 mb-2"
              style={{ color: TM, borderBottom: `1px solid ${IB}` }}
            >
              Programa de beneficios
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-[10px]" style={{ color: TM }}>Activar programa</span>
              <div className="w-7 h-3.5 rounded-full relative" style={{ background: P }}>
                <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
              </div>
            </div>

            {/* Stamp sub-section */}
            <div className="rounded-lg p-2.5" style={{ background: BG, border: `1px solid ${BD}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[10px]" style={{ color: TM }}>Tarjeta de sellos</span>
                <div className="w-7 h-3.5 rounded-full relative" style={{ background: P }}>
                  <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                </div>
              </div>

              <div className="mb-2">
                <div className="font-sans text-[9px] uppercase tracking-wide mb-1" style={{ color: TF }}>Sellos para completar</div>
                <input
                  readOnly
                  value="10"
                  className="w-14 px-2 py-1 rounded-lg font-sans text-[10px] outline-none"
                  style={{
                    border: `1.5px solid ${P}`,
                    background: IB,
                    color: TM,
                    boxShadow: `0 0 0 2px ${P}22`,
                  }}
                />
              </div>

              <div>
                <div className="font-sans text-[9px] uppercase tracking-wide mb-1" style={{ color: TF }}>Recompensa al completar</div>
                <div
                  className="px-2 py-1 rounded-lg font-sans text-[10px]"
                  style={{ background: IB, border: `1px solid ${BD}`, color: TM }}
                >
                  1 café gratis
                </div>
              </div>
            </div>
          </div>

          {/* Rewards section — new reward form open */}
          <div
            className="rounded-xl p-3"
            style={{ background: 'white', border: `2px solid ${P}`, boxShadow: `0 0 0 3px ${P}18` }}
          >
            <div className="font-sans text-[10px] font-semibold mb-2.5" style={{ color: TM }}>Nueva recompensa</div>

            {/* Emoji picker */}
            <div className="flex gap-1 mb-2.5 flex-wrap">
              {['☕', '🥐', '🎂', '🍵', '🍫', '🎁'].map((e) => (
                <div
                  key={e}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                  style={{
                    background: e === '☕' ? `${P}25` : IB,
                    border: e === '☕' ? `1.5px solid ${P}` : '1.5px solid transparent',
                  }}
                >
                  {e}
                </div>
              ))}
            </div>

            {/* Fields */}
            <div className="space-y-1.5 mb-2.5">
              <div
                className="px-2 py-1.5 rounded-lg font-sans text-[10px]"
                style={{ background: IB, border: `1px solid ${BD}`, color: TM }}
              >
                Espresso doble
              </div>
              <div
                className="px-2 py-1.5 rounded-lg font-sans text-[10px]"
                style={{ background: IB, border: `1px solid ${BD}`, color: TF }}
              >
                Descripción (opcional)
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-16 px-2 py-1.5 rounded-lg font-sans text-[10px]"
                  style={{ background: IB, border: `1px solid ${BD}`, color: TM }}
                >
                  25000
                </div>
                <span className="font-sans text-[9px]" style={{ color: TF }}>puntos necesarios</span>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                className="px-2.5 py-1.5 rounded-lg font-sans text-[10px]"
                style={{ border: `1px solid ${BD}`, color: TT, background: IB }}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-1.5 rounded-lg font-sans text-[10px] font-semibold text-white"
                style={{ background: P }}
              >
                Crear recompensa
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Barista screenshot ─────────────────────────────────────────
const STAMPS_TOTAL = 10
const STAMPS_FILLED = 5

export function BaristaScreenshot() {
  const stamps = Array.from({ length: STAMPS_TOTAL })

  return (
    <div
      className="w-full rounded-[12px] overflow-hidden"
      style={{ border: '1px solid #ccc3bb', boxShadow: '0 20px 60px rgba(67,53,44,0.18)', background: BG }}
    >
      <BrowserBar url="sipo.ar/dashboard" />

      <div className="flex" style={{ minHeight: 380 }}>
        <Sidebar active="inicio" />

        {/* Content */}
        <div className="flex-1 overflow-auto p-4" style={{ background: BG }}>

          {/* Header */}
          <div className="mb-3">
            <div className="font-serif font-medium text-sm" style={{ color: TM }}>Panel de barista</div>
            <div className="font-sans text-[9px]" style={{ color: TF }}>Buscá un cliente para agregar sellos o puntos.</div>
          </div>

          {/* Search card — with suggestion dropdown */}
          <div
            className="rounded-xl p-3 mb-2"
            style={{ background: 'white', border: `1px solid ${BD}` }}
          >
            <div className="font-sans text-[9px] uppercase tracking-wider mb-1.5" style={{ color: TF }}>Nombre o email</div>
            <div className="relative">
              <div
                className="px-2.5 py-2 rounded-xl font-sans text-[10px]"
                style={{ background: IB, border: `1.5px solid ${P}`, color: TM, boxShadow: `0 0 0 2px ${P}18` }}
              >
                valentina@gmail.com
              </div>
              {/* Dropdown */}
              <div
                className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                style={{ border: `1px solid ${BD}`, background: 'white', boxShadow: '0 8px 24px rgba(67,53,44,0.1)' }}
              >
                <div
                  className="flex items-center gap-2 px-2.5 py-2"
                  style={{ background: IB }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                    style={{ background: TM }}
                  >
                    V
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-medium text-[10px] truncate" style={{ color: TM }}>Valentina Ruiz</div>
                    <div className="font-sans text-[9px] truncate" style={{ color: TF }}>valentina@gmail.com</div>
                  </div>
                  <div className="font-sans text-[9px] flex-shrink-0 text-right" style={{ color: TF }}>
                    <div>5/10 ☕</div>
                    <div>28.500 pts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer card */}
          <div
            className="rounded-xl p-2.5 mb-2 flex items-center gap-2"
            style={{ background: 'white', border: `1px solid ${BD}`, marginTop: 48 }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0"
              style={{ background: TM }}
            >
              V
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-[10px] truncate" style={{ color: TM }}>Valentina Ruiz</div>
              <div className="font-sans text-[9px]" style={{ color: TF }}>5/10 sellos · 28.500 pts</div>
            </div>
          </div>

          {/* Stamp card */}
          <div
            className="rounded-xl p-3 mb-2"
            style={{ background: 'white', border: `1px solid ${BD}` }}
          >
            <div className="font-sans font-semibold text-[10px] mb-2.5" style={{ color: TM }}>Tarjeta de sellos</div>
            <div className="grid gap-1.5 mb-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {stamps.map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-full flex items-center justify-center"
                  style={i < STAMPS_FILLED
                    ? { background: P }
                    : { background: IB, border: `1.5px solid ${BD}` }
                  }
                >
                  {i < STAMPS_FILLED && (
                    <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }} />
                  )}
                </div>
              ))}
            </div>
            <button
              className="w-full flex items-center justify-center gap-1 py-2 rounded-xl font-sans font-semibold text-white text-[10px]"
              style={{ background: P }}
            >
              <Plus size={10} /> Agregar sello
            </button>
          </div>

          {/* Points */}
          <div
            className="rounded-xl p-3"
            style={{ background: 'white', border: `1px solid ${BD}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 font-sans font-semibold text-[10px]" style={{ color: TM }}>
                <Star size={10} /> Puntos
              </div>
              <span className="font-sans text-[10px] font-bold" style={{ color: P }}>28.500 pts</span>
            </div>

            <div className="font-sans text-[9px] font-medium mb-1.5 uppercase tracking-wide" style={{ color: TF }}>
              Canjear recompensas
            </div>
            <div className="space-y-1">
              {[
                { emoji: '☕', name: 'Café gratis',     pts: '15.000', can: true  },
                { emoji: '🥐', name: 'Medialunas x4',  pts: '20.000', can: true  },
                { emoji: '🎂', name: 'Torta del día',   pts: '38.000', can: false },
              ].map(r => (
                <div
                  key={r.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{
                    border: `1px solid ${r.can ? `${P}55` : BD}`,
                    background: r.can ? `${P}08` : 'transparent',
                    opacity: r.can ? 1 : 0.45,
                  }}
                >
                  <span className="text-sm flex-shrink-0">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-[9px] font-medium truncate" style={{ color: TM }}>{r.name}</div>
                    <div className="font-sans text-[9px]" style={{ color: TF }}>{r.pts} pts</div>
                  </div>
                  {r.can && <Check size={10} style={{ color: P, flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Customer (mobile) screenshot ───────────────────────────────
const CUSTOMER_POINTS = 28500
const REWARDS = [
  { emoji: '☕', name: 'Café gratis',       desc: 'Un café de tu elección',    pts: 15000, can: true  },
  { emoji: '🥐', name: 'Medialunas x4',    desc: 'Cuatro medialunas frescas', pts: 20000, can: true  },
  { emoji: '🏷️', name: '10% de descuento', desc: 'En tu próxima compra',      pts: 12000, can: true  },
  { emoji: '🎂', name: 'Torta del día',     desc: 'La torta del mostrador',    pts: 38000, can: false },
]

export function CustomerScreenshot() {
  return (
    <div
      className="rounded-[32px] overflow-hidden mx-auto"
      style={{
        width: 220,
        background: '#111',
        border: '8px solid #111',
        boxShadow: '0 24px 70px rgba(67,53,44,0.22), inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      {/* Notch */}
      <div className="flex justify-center pt-1 pb-0.5" style={{ background: '#111' }}>
        <div className="w-14 h-3.5 rounded-full" style={{ background: '#222' }} />
      </div>

      {/* Screen */}
      <div className="overflow-hidden" style={{ background: BG, borderRadius: '20px 20px 0 0', minHeight: 430 }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <div
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ background: IB, border: `1px solid ${BD}` }}
          >
            <ArrowLeft size={11} style={{ color: TM }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-sans text-[8px] uppercase tracking-wider font-medium" style={{ color: TF }}>Beneficios</div>
            <div className="font-serif font-medium text-xs leading-tight truncate" style={{ color: TM }}>Café Demo</div>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: IB, border: `1px solid ${BD}` }}
            >
              <UserRound size={11} style={{ color: TT }} />
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="px-3 pb-2">
          <div className="font-sans text-[9px]" style={{ color: TF }}>Hola,</div>
          <div className="font-serif font-medium" style={{ fontSize: '1.4rem', color: TM, lineHeight: 1.1 }}>
            Valentina
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-3 mb-2">
          <div className="flex p-0.5 rounded-xl" style={{ background: '#efe9e0' }}>
            <div
              className="flex-1 py-1.5 rounded-lg text-center font-sans text-[9px] font-medium"
              style={{ color: TF }}
            >
              Sellos
            </div>
            <div
              className="flex-1 py-1.5 rounded-lg text-center font-sans text-[9px] font-medium"
              style={{ background: 'white', color: TM }}
            >
              Puntos
            </div>
          </div>
        </div>

        {/* Points card */}
        <div className="px-3 mb-2">
          <div
            className="p-3 rounded-2xl"
            style={{ background: 'white', border: `1px solid ${BD}` }}
          >
            <div
              className="font-sans text-[8px] uppercase tracking-widest font-medium mb-1"
              style={{ color: TF }}
            >
              Tus puntos
            </div>
            <div className="flex items-baseline gap-1">
              <div
                className="font-serif font-semibold leading-none"
                style={{ fontSize: '1.8rem', color: P }}
              >
                {CUSTOMER_POINTS.toLocaleString('es-AR')}
              </div>
              <div className="font-sans text-[9px] font-medium" style={{ color: TT }}>pts</div>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="px-3 pb-4">
          <div className="font-sans font-semibold text-[10px] mb-1.5" style={{ color: TM }}>
            Canjeá tus puntos
          </div>
          <div className="space-y-1.5">
            {REWARDS.map(r => {
              const missing = r.pts - CUSTOMER_POINTS
              const pct = Math.min((CUSTOMER_POINTS / r.pts) * 100, 100)
              return (
                <div
                  key={r.name}
                  className="p-2 rounded-xl"
                  style={r.can
                    ? { background: 'white', border: `1.5px solid ${P}55` }
                    : { background: 'white', border: `1px solid ${BD}` }
                  }
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: IB }}
                    >
                      {r.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-semibold text-[9px] truncate" style={{ color: TM }}>{r.name}</div>
                      <div className="font-sans text-[8px]" style={{ color: TF }}>{r.pts.toLocaleString('es-AR')} pts</div>
                    </div>
                    {r.can ? (
                      <div
                        className="font-sans text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `${P}18`, color: P }}
                      >
                        ¡Canjeá!
                      </div>
                    ) : (
                      <div className="font-sans text-[8px] text-right flex-shrink-0" style={{ color: TF }}>
                        Faltan<br />
                        <span className="font-bold text-[9px]" style={{ color: TM }}>
                          {missing.toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}
                  </div>
                  {!r.can && (
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{ height: 3, background: '#e8dece' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: P }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="font-sans text-[8px] text-center mt-2" style={{ color: TF }}>
            Mostrá esta pantalla al barista para canjear.
          </div>
        </div>

      </div>

      {/* Home bar */}
      <div className="flex justify-center py-1.5" style={{ background: '#111' }}>
        <div className="w-16 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
      </div>
    </div>
  )
}