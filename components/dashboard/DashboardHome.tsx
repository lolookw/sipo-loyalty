'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Star, Gift, RotateCcw, Check, Plus, PartyPopper } from 'lucide-react'
import toast from 'react-hot-toast'

interface Reward {
  id: string
  name: string
  description: string | null
  pointsCost: number
  emoji: string | null
}

interface Cafe {
  id: string
  slug: string
  name: string
  primaryColor: string
  accentColor: string
  stampEnabled: boolean
  stampsRequired: number
  stampReward: string
  minPurchaseForStamp: number
  pointsEnabled: boolean
  pointsPerPeso: number
  currencySymbol: string
  rewards: Reward[]
}

interface CustomerData {
  id: string
  name: string
  email: string
  birthdate: string | null
  loyalty: { stamps: number; totalStamps: number; points: number; totalSpent: number } | null
}

function isBirthdayToday(birthdateStr: string | null): boolean {
  if (!birthdateStr) return false
  const bd = new Date(birthdateStr)
  const today = new Date()
  return bd.getUTCDate() === today.getDate() && bd.getUTCMonth() === today.getMonth()
}

export default function DashboardHome({ cafe }: { cafe: Cafe }) {
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [mode, setMode] = useState<'search' | 'new' | 'found'>('search')
  const [loading, setLoading] = useState(false)
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [suggestions, setSuggestions] = useState<CustomerData[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const primary = cafe.primaryColor
  const accent = cafe.accentColor

  // Autocomplete: debounce search as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); setSearching(false); return }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customer?search=${encodeURIComponent(q)}&cafeId=${cafe.id}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
          setShowSuggestions(data.length > 0)
        }
      } catch { /* silent */ }
      finally { setSearching(false) }
    }, 250)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, cafe.id])

  function selectSuggestion(c: CustomerData) {
    setCustomer(c)
    setQuery(c.email)
    setSuggestions([])
    setShowSuggestions(false)
    setSearching(false)
    setMode('found')
  }

  function goToCreate() {
    setShowSuggestions(false)
    setMode('new')
  }

  async function registerCustomer() {
    if (!newName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: query, name: newName, cafeId: cafe.id }),
      })
      const data = await res.json()
      setCustomer(data); setMode('found')
      toast.success(`${data.name} registrado/a`)
    } catch { toast.error('Error al registrar') }
    finally { setLoading(false) }
  }

  async function doTransaction(type: string, extra?: Record<string, unknown>) {
    if (!customer) return
    setLoading(true)
    try {
      const res = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, customerId: customer.id, cafeId: cafe.id, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      toast.success(data.message)
      setCustomer(prev => prev ? { ...prev, loyalty: data.link } : prev)
      setPurchaseAmount('')
    } catch { toast.error('Error al procesar') }
    finally { setLoading(false) }
  }

  function reset() {
    setCustomer(null); setQuery(''); setNewName(''); setMode('search'); setPurchaseAmount('')
    setSuggestions([]); setShowSuggestions(false); setSearching(false)
  }

  const stamps = customer?.loyalty?.stamps ?? 0
  const points = customer?.loyalty?.points ?? 0
  const canRedeemStamp = stamps >= cafe.stampsRequired
  const purchaseAmountValue = parseFloat(purchaseAmount)
  const hasPurchaseAmount = Number.isFinite(purchaseAmountValue) && purchaseAmountValue > 0
  const meetsStampMinimum = cafe.minPurchaseForStamp <= 0 || (hasPurchaseAmount && purchaseAmountValue >= cafe.minPurchaseForStamp)

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="mb-7">
        <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>Panel de barista</h1>
        <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>Buscá un cliente para agregar sellos o puntos.</p>
      </div>

      <AnimatePresence mode="wait">

        {mode === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div
              className="rounded-[24px] p-5"
              style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
            >
              <label className="font-sans text-xs font-medium mb-2.5 block tracking-wide uppercase" style={{ color: '#9B9089' }}>
                Nombre o email del cliente
              </label>
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre o email del cliente…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl font-sans text-sm outline-none transition-colors"
                    style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
                    autoComplete="off"
                  />
                  <button
                    onClick={goToCreate}
                    disabled={!query.trim() || searching}
                    className="px-4 py-2.5 rounded-xl font-sans font-medium text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
                    style={{ background: primary }}
                  >
                    <UserPlus size={15} /> Crear
                  </button>
                </div>

                {/* Suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-20"
                      style={{ border: '1px solid #E9DED1', background: 'white', boxShadow: '0 8px 24px rgba(67,53,44,0.08)' }}
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={s.id}
                          onMouseDown={() => selectSuggestion(s)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{
                            borderTop: i > 0 ? '1px solid #F6F0E8' : 'none',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FCFBF8'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                            style={{ background: primary }}
                          >
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-sans font-medium text-sm truncate" style={{ color: '#43352C' }}>{s.name}</div>
                            <div className="font-sans text-xs truncate" style={{ color: '#9B9089' }}>{s.email}</div>
                          </div>
                          {s.loyalty && (
                            <div className="font-sans text-xs flex-shrink-0 text-right" style={{ color: '#9B9089' }}>
                              {cafe.stampEnabled && <div>{s.loyalty.stamps}/{cafe.stampsRequired} ☕</div>}
                              {cafe.pointsEnabled && <div>{Math.floor(s.loyalty.points).toLocaleString()} pts</div>}
                            </div>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-2.5 min-h-[1.25rem]">
                {searching ? (
                  <p className="font-sans text-xs" style={{ color: '#9B9089' }}>Buscando cliente…</p>
                ) : (
                  <p className="font-sans text-xs" style={{ color: '#C0B4A8' }}>
                    Si no aparece en la lista, hacé clic en <strong>Crear</strong> para registrarlo.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'new' && (
          <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div
              className="rounded-[24px] p-5"
              style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}20` }}>
                  <UserPlus size={15} style={{ color: accent }} />
                </div>
                <div>
                  <div className="font-sans font-semibold text-sm" style={{ color: '#43352C' }}>Cliente nuevo</div>
                  <div className="font-sans text-xs" style={{ color: '#9B9089' }}>{query}</div>
                </div>
              </div>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl font-sans text-sm mb-3 outline-none transition-colors"
                style={{ border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2.5 rounded-xl font-sans text-sm transition-colors"
                  style={{ border: '1px solid #E9DED1', color: '#6B6B6B', background: '#F6F0E8' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={registerCustomer}
                  disabled={loading || !newName.trim()}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: primary }}
                >
                  {loading ? 'Registrando…' : 'Registrar cliente'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'found' && customer && (
          <motion.div key="found" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">

            {/* Birthday banner */}
            {isBirthdayToday(customer.birthdate) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[20px] px-4 py-3 flex items-center gap-3"
                style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}
              >
                <PartyPopper size={17} style={{ color: accent, flexShrink: 0 }} />
                <div>
                  <div className="font-sans font-semibold text-sm" style={{ color: accent }}>
                    ¡Hoy es el cumpleaños de {customer.name.split(' ')[0]}!
                  </div>
                  <div className="font-sans text-xs" style={{ color: '#6B6B6B' }}>
                    Capaz es buen momento para sorprenderlo/a 🎂
                  </div>
                </div>
              </motion.div>
            )}

            {/* Customer card */}
            <div
              className="rounded-[20px] p-4 flex items-center gap-3"
              style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 4px 16px rgba(67,53,44,0.03)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                style={{ background: '#43352C' }}
              >
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-sans font-semibold text-sm truncate" style={{ color: '#43352C' }}>{customer.name}</div>
                <div className="font-sans text-xs" style={{ color: '#9B9089' }}>{customer.email}</div>
                <div className="flex gap-3 mt-0.5">
                  {cafe.stampEnabled && (
                    <span className="font-sans text-xs" style={{ color: '#9B9089' }}>
                      <span className="font-semibold" style={{ color: '#43352C' }}>{stamps}</span>/{cafe.stampsRequired} sellos
                    </span>
                  )}
                  {cafe.pointsEnabled && (
                    <span className="font-sans text-xs" style={{ color: '#9B9089' }}>
                      <span className="font-semibold" style={{ color: '#43352C' }}>{Math.floor(points).toLocaleString()}</span> pts
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={reset}
                className="p-2 rounded-xl transition-colors"
                style={{ background: '#F6F0E8', color: '#6B6B6B' }}
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {/* Stamps */}
            {cafe.stampEnabled && (
              <div
                className="rounded-[24px] p-5"
                style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 4px 16px rgba(67,53,44,0.03)' }}
              >
                <div className="font-sans font-semibold text-sm mb-4" style={{ color: '#43352C' }}>Tarjeta de sellos</div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {Array.from({ length: cafe.stampsRequired }).map((_, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full transition-all"
                      style={
                        i < stamps
                          ? { background: primary }
                          : { background: '#F6F0E8', border: '1.5px solid #E9DED1' }
                      }
                    />
                  ))}
                </div>

                {cafe.minPurchaseForStamp > 0 && (
                  <div className="mb-3">
                    <div
                      className="flex items-center gap-2 rounded-xl px-3"
                      style={{ border: '1px solid #E9DED1', background: '#F6F0E8' }}
                    >
                      <span className="font-sans text-sm" style={{ color: '#9B9089' }}>{cafe.currencySymbol}</span>
                      <input
                        type="number"
                        placeholder={`Mínimo ${cafe.currencySymbol}${cafe.minPurchaseForStamp} para sello`}
                        value={purchaseAmount}
                        onChange={e => setPurchaseAmount(e.target.value)}
                        className="flex-1 py-2.5 outline-none text-sm bg-transparent font-sans"
                        style={{ color: '#43352C' }}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {hasPurchaseAmount && !meetsStampMinimum && (
                      <p className="font-sans text-xs mt-1.5 text-center" style={{ color: accent }}>
                        Compra mínima para sello: {cafe.currencySymbol}{cafe.minPurchaseForStamp}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => doTransaction('stamp_add', hasPurchaseAmount ? { amount: purchaseAmountValue } : undefined)}
                    disabled={loading || canRedeemStamp || !meetsStampMinimum}
                    className="flex-1 py-2.5 rounded-xl font-sans font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
                    style={{ background: primary }}
                  >
                    <Plus size={15} /> Agregar sello
                  </button>
                  {canRedeemStamp && (
                    <button
                      onClick={() => doTransaction('stamp_redeem')}
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-xl font-sans font-semibold text-sm transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-1.5"
                      style={{ border: `1.5px solid ${accent}`, color: accent }}
                    >
                      <Check size={15} /> Canjear
                    </button>
                  )}
                </div>
                {canRedeemStamp && (
                  <p className="font-sans text-center text-xs mt-2.5 font-medium" style={{ color: accent }}>
                    Tarjeta completa · Premio: {cafe.stampReward}
                  </p>
                )}
              </div>
            )}

            {/* Points */}
            {cafe.pointsEnabled && (
              <div
                className="rounded-[24px] p-5"
                style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 4px 16px rgba(67,53,44,0.03)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="font-sans font-semibold text-sm flex items-center gap-1.5" style={{ color: '#43352C' }}>
                    <Star size={14} /> Puntos
                  </div>
                  <span className="font-sans text-sm font-bold" style={{ color: accent }}>{Math.floor(points).toLocaleString()} pts</span>
                </div>

                <div className="flex gap-2 mb-3">
                  <div
                    className="flex items-center gap-2 flex-1 rounded-xl px-3"
                    style={{ border: '1px solid #E9DED1', background: '#F6F0E8' }}
                  >
                    <span className="font-sans text-sm" style={{ color: '#9B9089' }}>{cafe.currencySymbol}</span>
                    <input
                      type="number"
                      placeholder="Monto de la compra"
                      value={purchaseAmount}
                      onChange={e => setPurchaseAmount(e.target.value)}
                      className="flex-1 py-2.5 outline-none text-sm bg-transparent font-sans"
                      style={{ color: '#43352C' }}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <button
                    onClick={() => doTransaction('points_add', { amount: purchaseAmountValue })}
                    disabled={loading || !hasPurchaseAmount}
                    className="px-4 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 active:scale-95 disabled:opacity-40"
                    style={{ background: primary }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {hasPurchaseAmount && (
                  <p className="font-sans text-xs mb-3 text-center" style={{ color: '#9B9089' }}>
                    +{Math.floor(purchaseAmountValue * cafe.pointsPerPeso).toLocaleString()} puntos por esta compra
                  </p>
                )}

                {cafe.rewards.length > 0 && (
                  <div>
                    <div
                      className="font-sans text-xs font-medium mb-2 flex items-center gap-1.5 uppercase tracking-wide"
                      style={{ color: '#9B9089' }}
                    >
                      <Gift size={11} /> Canjear recompensas
                    </div>
                    <div className="space-y-1.5">
                      {cafe.rewards.map(reward => {
                        const canRedeem = points >= reward.pointsCost
                        return (
                          <button
                            key={reward.id}
                            onClick={() => doTransaction('points_redeem', { rewardId: reward.id })}
                            disabled={!canRedeem || loading}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left disabled:opacity-40"
                            style={{
                              border: `1px solid ${canRedeem ? accent : '#E9DED1'}`,
                              background: canRedeem ? `${accent}08` : 'transparent',
                            }}
                            onMouseEnter={e => { if (!(!canRedeem || loading)) (e.currentTarget as HTMLElement).style.background = '#FCFBF8' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = canRedeem ? `${accent}08` : 'transparent' }}
                          >
                            <span className="text-xl">{reward.emoji || '🎁'}</span>
                            <div className="flex-1">
                              <div className="font-sans font-medium text-sm" style={{ color: '#43352C' }}>{reward.name}</div>
                              <div className="font-sans text-xs" style={{ color: '#9B9089' }}>{reward.pointsCost.toLocaleString()} pts</div>
                            </div>
                            {canRedeem && <Check size={14} style={{ color: accent }} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
