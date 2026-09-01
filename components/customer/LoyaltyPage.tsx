'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Coffee, UserRound, Phone, Cake, Heart, Mail, QrCode, LogOut, X, Star, Clock, Share2, Copy } from 'lucide-react'
import dynamic from 'next/dynamic'
const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => ({ default: m.QRCodeSVG })), { ssr: false })
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import AddToWallet from './AddToWallet'

interface Reward {
  id: string
  name: string
  description: string | null
  pointsCost: number
  emoji: string | null
}

interface ActiveCampaign {
  id: string
  name: string
  type: string // "points_multiplier" | "stamp_multiplier" | "bonus_points" | "signup_bonus"
  multiplier: number | null
  bonusPoints: number | null
  bonusStamps: number | null
  endsAt: string
}

function campaignBannerText(c: ActiveCampaign): string {
  const until = new Date(c.endsAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })
  if (c.type === 'points_multiplier') return `x${c.multiplier} puntos hasta el ${until}`
  if (c.type === 'stamp_multiplier') return `x${c.multiplier} sellos hasta el ${until}`
  return `+${c.bonusPoints} pts de regalo por compra hasta el ${until}`
}

function signupBonusBannerText(c: ActiveCampaign): string {
  const until = new Date(c.endsAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })
  const parts: string[] = []
  if (c.bonusPoints) parts.push(`+${c.bonusPoints} pts`)
  if (c.bonusStamps) parts.push(`+${c.bonusStamps} ${c.bonusStamps === 1 ? 'sello' : 'sellos'}`)
  return `${parts.join(' y ')} de regalo si te registrás antes del ${until}`
}

interface Transaction {
  id: string
  type: string
  stamps: number | null
  points: number | null
  amount: number | null
  note: string | null
  createdAt: string
}

interface Cafe {
  id: string
  slug: string
  name: string
  coverUrl: string | null
  primaryColor: string
  accentColor: string
  stampEnabled: boolean
  stampsRequired: number
  stampReward: string
  pointsEnabled: boolean
  currencySymbol: string
  reviewUrl: string | null
  referralEnabled: boolean
  referralRewardType: string
  referralRewardAmount: number
  rewards: Reward[]
}

interface CustomerData {
  id: string
  name: string
  email: string
  phone: string | null
  birthdate: string | null
  favoriteDrink: string | null
  loyalty: { stamps: number; totalStamps: number; points: number; totalSpent: number; stampsExpireAt: string | null; bonusPoints?: number; bonusExpireAt?: string | null; referralCode?: string | null } | null
  transactions: Transaction[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function txLabel(tx: Transaction): { text: string; value: string; positive: boolean } {
  switch (tx.type) {
    case 'stamp_add':    return { text: 'Sello agregado',    value: '+1 sello',                             positive: true  }
    case 'stamp_redeem': return { text: tx.note?.replace('Redeemed: ', '') || 'Premio canjeado', value: '🎉 Premio', positive: true }
    case 'points_add':   return { text: 'Compra registrada', value: `+${tx.points} pts`,                   positive: true  }
    case 'referral_reward': return {
      text: 'Premio por invitar a un amigo',
      value: tx.stamps ? `+${tx.stamps} ${tx.stamps === 1 ? 'sello' : 'sellos'}` : `+${tx.points} pts`,
      positive: true,
    }
    case 'signup_bonus': return {
      text: 'Bono de bienvenida',
      value: tx.points && tx.stamps ? `+${tx.points} pts y +${tx.stamps}` : tx.stamps ? `+${tx.stamps} ${tx.stamps === 1 ? 'sello' : 'sellos'}` : `+${tx.points} pts`,
      positive: true,
    }
    case 'points_redeem':return { text: tx.note?.replace('Redeemed: ', '') || 'Recompensa canjeada', value: `-${Math.abs(tx.points ?? 0)} pts`, positive: false }
    default:             return { text: tx.type, value: '', positive: true }
  }
}

// ── Session persistence (localStorage, 7-day TTL) ──────────────────────────
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000

function saveSession(cafeId: string, email: string, customer: CustomerData, token?: string) {
  try {
    const existing = localStorage.getItem(`loyalty_${cafeId}`)
    const prev = existing ? JSON.parse(existing) : {}
    localStorage.setItem(`loyalty_${cafeId}`, JSON.stringify({
      email, customer, savedAt: Date.now(),
      token: token ?? prev.token ?? null,
    }))
  } catch { /* storage not available */ }
}

function loadSession(cafeId: string): { email: string; customer: CustomerData; token: string | null } | null {
  try {
    const raw = localStorage.getItem(`loyalty_${cafeId}`)
    if (!raw) return null
    const { email, customer, savedAt, token } = JSON.parse(raw)
    if (Date.now() - savedAt > SESSION_TTL) {
      localStorage.removeItem(`loyalty_${cafeId}`)
      return null
    }
    return { email, customer, token: token ?? null }
  } catch { return null }
}

function clearSession(cafeId: string) {
  try { localStorage.removeItem(`loyalty_${cafeId}`) } catch { /* ignore */ }
}

// Shared frosted style for dark/photo backgrounds
const frostedDark = {
  background: 'rgba(255,255,255,0.13)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.18)',
} as React.CSSProperties

const frostedLight = {
  background: 'white',
  border: '1px solid #E9DED1',
} as React.CSSProperties

export default function LoyaltyPage({ cafe }: { cafe: Cafe }) {
  const [step, setStep] = useState<'email' | 'otp' | 'register' | 'dashboard' | 'profile'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [name, setName] = useState('')
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'stamps' | 'points'>('stamps')
  const [profileForm, setProfileForm] = useState({ phone: '', birthdate: '', favoriteDrink: '' })
  const [justRegistered, setJustRegistered] = useState(false) // recién se registró → el step 'profile' se muestra como invitación, no como edición manual
  const [showQr, setShowQr] = useState(false)
  const [customerToken, setCustomerToken] = useState<string | null>(null)
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([])

  // Campañas vivas del café (la página es ISR, esto se busca fresco al montar)
  useEffect(() => {
    fetch(`/api/campaign/public?cafeId=${cafe.id}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setActiveCampaigns(data) })
      .catch(() => { /* sin banner */ })
  }, [cafe.id])

  // Código de invitación (?ref=): se guarda hasta completar el login/registro (sobrevive al ida-y-vuelta del OTP)
  const [pendingRef, setPendingRef] = useState<string | null>(null)
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('ref')
      if (fromUrl?.trim()) {
        setPendingRef(fromUrl.trim())
        localStorage.setItem(`sipo_ref_${cafe.id}`, JSON.stringify({ code: fromUrl.trim(), savedAt: Date.now() }))
        return
      }
      const raw = localStorage.getItem(`sipo_ref_${cafe.id}`)
      if (raw) {
        const { code, savedAt } = JSON.parse(raw)
        if (Date.now() - savedAt < 24 * 60 * 60 * 1000) setPendingRef(code)
        else localStorage.removeItem(`sipo_ref_${cafe.id}`)
      }
    } catch { /* sin ref */ }
  }, [cafe.id])

  function clearPendingRef() {
    setPendingRef(null)
    try { localStorage.removeItem(`sipo_ref_${cafe.id}`) } catch { /* ignore */ }
  }

  // Hydrate session from localStorage on mount
  useEffect(() => {
    const saved = loadSession(cafe.id)
    if (!saved) return
    if (!saved.token) {
      // Old session without token — clear and force re-login once
      clearSession(cafe.id)
      return
    }
    setEmail(saved.email)
    setCustomer(saved.customer)
    setCustomerToken(saved.token)
    setStep('dashboard')
  }, [cafe.id])

  // Refresh customer data silently when the tab regains visibility
  useEffect(() => {
    if (step !== 'dashboard' || !email || !customerToken) return
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch(`/api/customer/public?email=${encodeURIComponent(email)}&cafeId=${cafe.id}`, {
          headers: { Authorization: `Bearer ${customerToken}` },
        })
        if (res.status === 401) { handleSessionExpired(); return }
        if (!res.ok) return
        const data = await res.json()
        if (data) {
          const updated = { ...data, loyalty: data.cafes?.[0] ?? data.loyalty ?? null }
          setCustomer(updated)
          saveSession(cafe.id, email, updated)
        }
      } catch { /* silent */ }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [step, email, customerToken, cafe.id])

  const primary = cafe.primaryColor
  const accent = cafe.accentColor
  const hasCover = !!cafe.coverUrl

  // Contextual color helpers
  const textMain   = hasCover ? 'white'                   : '#43352C'
  const textMuted  = hasCover ? 'rgba(255,255,255,0.48)'  : '#6B6B6B'
  const textFaint  = hasCover ? 'rgba(255,255,255,0.45)'  : '#9B9089'
  const card       = hasCover ? frostedDark                : frostedLight
  const inputStyle = hasCover
    ? { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.14)', color: 'white' } as React.CSSProperties
    : { background: '#F6F0E8', border: '1px solid #E9DED1', color: '#43352C' } as React.CSSProperties

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/customer/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStep('otp')
        toast.success('Código enviado a tu email')
      } else {
        toast.error('Error al enviar el código')
      }
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otpCode.length !== 6) return
    setLoading(true)
    try {
      const res = await fetch('/api/customer/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode, cafeId: cafe.id, ...(pendingRef ? { ref: pendingRef } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Código inválido')
        return
      }
      if (data.newUser) {
        setCustomerToken(data.customerToken ?? null)
        setStep('register')
      } else {
        clearPendingRef()
        setCustomer(data)
        setCustomerToken(data.customerToken ?? null)
        saveSession(cafe.id, email, data, data.customerToken)
        setStep('dashboard')
      }
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/customer/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
        },
        body: JSON.stringify({ email, name, cafeId: cafe.id, ...(pendingRef ? { ref: pendingRef } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al registrarse')
        return
      }
      clearPendingRef()
      setCustomer(data)
      setCustomerToken(data.customerToken ?? null)
      saveSession(cafe.id, email, data, data.customerToken)
      setProfileForm({ phone: '', birthdate: '', favoriteDrink: '' })
      setJustRegistered(true)
      setStep('profile')
      toast.success(`Bienvenido/a, ${name}`)
    } catch { toast.error('Error al registrarse') }
    finally { setLoading(false) }
  }

  function openProfile() {
    if (!customer) return
    setJustRegistered(false)
    setProfileForm({
      phone: customer.phone || '',
      birthdate: customer.birthdate ? customer.birthdate.slice(0, 10) : '',
      favoriteDrink: customer.favoriteDrink || '',
    })
    setStep('profile')
  }

  function skipProfile() {
    setJustRegistered(false)
    setStep('dashboard')
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    if (!customer) return
    setLoading(true)
    try {
      const res = await fetch('/api/customer/public', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
        },
        body: JSON.stringify({ email: customer.email, ...profileForm }),
      })
      if (res.status === 401) { handleSessionExpired(); return }
      if (res.ok) {
        const data = await res.json()
        setCustomer(prev => {
          if (!prev) return prev
          const updated = { ...prev, phone: data.phone, birthdate: data.birthdate, favoriteDrink: data.favoriteDrink }
          saveSession(cafe.id, prev.email, updated, customerToken ?? undefined)
          return updated
        })
        if (!justRegistered) toast.success('Perfil actualizado')
        setJustRegistered(false)
        setStep('dashboard')
      } else {
        toast.error('Error al guardar')
      }
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  function handleLogout() {
    clearSession(cafe.id)
    setCustomer(null)
    setEmail('')
    setOtpCode('')
    setCustomerToken(null)
    setStep('email')
  }

  function handleSessionExpired() {
    clearSession(cafe.id)
    setCustomer(null)
    setCustomerToken(null)
    setStep('email')
    toast('Tu sesión expiró, ingresá de nuevo.', { icon: '🔑' })
  }

  function isBirthday(birthdateStr: string | null): boolean {
    if (!birthdateStr) return false
    const bd = new Date(birthdateStr)
    const today = new Date()
    return bd.getUTCMonth() === today.getUTCMonth() && bd.getUTCDate() === today.getUTCDate()
  }

  // Referidos: link para invitar amigos
  const referralCode = customer?.loyalty?.referralCode ?? null
  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://sipo.ar'}/${cafe.slug}/loyalty?ref=${referralCode}`
    : ''
  const referralRewardLabel = cafe.referralRewardType === 'stamps'
    ? `${cafe.referralRewardAmount} ${cafe.referralRewardAmount === 1 ? 'sello' : 'sellos'}`
    : `${cafe.referralRewardAmount} puntos`

  async function copyReferral() {
    try { await navigator.clipboard.writeText(referralLink); toast.success('Link copiado') }
    catch { toast.error('No se pudo copiar') }
  }

  async function shareReferral() {
    if (navigator.share) {
      try { await navigator.share({ title: cafe.name, text: `Sumate al programa de beneficios de ${cafe.name} ☕`, url: referralLink }) }
      catch { /* compartir cancelado */ }
    } else copyReferral()
  }

  // Bono de bienvenida: se anuncia ANTES de registrarse — después ya no aplica
  const signupCampaign = activeCampaigns.find(c => c.type === 'signup_bonus') ?? null

  const stamps = customer?.loyalty?.stamps ?? 0
  // Puntos de regalo (campañas): cuentan si el bucket no venció
  const rawBonus = customer?.loyalty?.bonusPoints ?? 0
  const bonusExpireAt = customer?.loyalty?.bonusExpireAt ? new Date(customer.loyalty.bonusExpireAt) : null
  const bonusPoints = rawBonus > 0 && (!bonusExpireAt || bonusExpireAt >= new Date()) ? rawBonus : 0
  const points = (customer?.loyalty?.points ?? 0) + bonusPoints

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={!hasCover ? { background: '#FAF7F2' } : undefined}
    >
      {/* ── Background photo + solid overlay ── */}
      {hasCover && (
        <div className="fixed inset-0 z-0">
          <Image
            src={cafe.coverUrl!}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            unoptimized={!cafe.coverUrl!.includes('.supabase.co')}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,12,10,0.2) 0%, rgba(15,12,10,0.55) 40%, rgba(15,12,10,0.88) 100%)' }} />
        </div>
      )}

      {/* ── Header ── */}
      <div className="relative z-10 px-5 pt-5 pb-4 flex items-center gap-3">
        <Link
          href={`/${cafe.slug}`}
          className="p-2 rounded-xl transition-colors"
          style={hasCover
            ? { background: 'rgba(255,255,255,0.1)', color: 'white' }
            : { background: '#F6F0E8', color: '#43352C', border: '1px solid #E9DED1' }
          }
        >
          <ArrowLeft size={17} />
        </Link>
        <div>
          <div
            className="font-sans text-xs uppercase tracking-widest font-medium"
            style={{ color: textFaint }}
          >
            Beneficios
          </div>
          <div
            className="font-serif font-medium text-lg leading-tight"
            style={{ color: textMain }}
          >
            {cafe.name}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {(step === 'email' || step === 'otp' || step === 'register') && (
            <Link
              href={`/${cafe.slug}/login`}
              className="font-sans text-xs py-1 px-2.5 rounded-full flex items-center gap-1 transition-opacity hover:opacity-70"
              style={hasCover
                ? { color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }
                : { color: '#6B6B6B', background: '#F6F0E8', border: '1px solid #E9DED1' }
              }
            >
              <UserRound size={11} />
              Soy del equipo
            </Link>
          )}
          <img
            src={hasCover ? '/logo-light.svg' : '/logo.svg'}
            width={20}
            height={20}
            alt=""
            style={{ opacity: hasCover ? 0.55 : 0.65 }}
          />
          {(step === 'dashboard' || step === 'profile') && (
            <>
              <span style={{ display: 'inline-block', width: 1, height: 14, background: hasCover ? 'rgba(255,255,255,0.3)' : '#C0B4A8' }} />
              <span className="font-serif font-semibold" style={{ fontSize: '0.95rem', color: textMuted }}>Sipo</span>
            </>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 px-5 py-4 max-w-sm mx-auto w-full pb-16">
        <AnimatePresence mode="wait">

          {/* ── Step: email ── */}
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-10 mt-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
                  style={{ background: hasCover ? primary : '#43352C' }}
                >
                  <Coffee size={22} color="white" strokeWidth={1.25} />
                </div>
                <h2
                  className="font-serif font-medium leading-tight mb-3"
                  style={{ fontSize: '2rem', color: textMain }}
                >
                  Tu programa<br />de fidelidad
                </h2>
                <p className="font-sans text-sm leading-relaxed" style={{ color: textMuted }}>
                  Ingresá tu email para ver tus sellos y puntos.
                </p>
              </div>

              {/* Bono de bienvenida — se muestra ANTES de registrarse, es el incentivo para sumarse ahora */}
              {signupCampaign && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-4 py-3.5 rounded-2xl flex items-center gap-3 mb-3"
                  style={hasCover
                    ? { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }
                    : { background: `${accent}14`, border: `1px solid ${accent}44` }
                  }
                >
                  <span className="text-xl">🎉</span>
                  <div className="min-w-0">
                    <p className="font-sans font-semibold text-sm" style={{ color: textMain }}>
                      {signupCampaign.name}
                    </p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: textMuted }}>
                      {signupBonusBannerText(signupCampaign)}
                    </p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={inputStyle}
                >
                  <Mail size={15} style={{ color: textFaint, flexShrink: 0 }} />
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex-1 outline-none text-sm bg-transparent font-sans placeholder:opacity-40"
                    style={{ color: textMain }}
                    required
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: hasCover ? primary : '#43352C' }}
                >
                  {loading ? 'Enviando código…' : 'Continuar'}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step: otp ── */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-10 mt-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
                  style={{ background: hasCover ? primary : '#43352C' }}
                >
                  <Mail size={22} color="white" strokeWidth={1.25} />
                </div>
                <h2
                  className="font-serif font-medium leading-tight mb-3"
                  style={{ fontSize: '2rem', color: textMain }}
                >
                  Revisá<br />tu email
                </h2>
                <p className="font-sans text-sm leading-relaxed" style={{ color: textMuted }}>
                  Te enviamos un código de 6 dígitos a <span style={{ color: textMain }}>{email}</span>.
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-3">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={inputStyle}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 outline-none text-center text-2xl tracking-widest bg-transparent font-sans placeholder:opacity-30 placeholder:text-base placeholder:tracking-normal"
                    style={{ color: textMain }}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-4 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: hasCover ? primary : '#43352C' }}
                >
                  {loading ? 'Verificando…' : 'Verificar código'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtpCode('') }}
                  className="w-full font-sans text-xs py-2 transition-opacity hover:opacity-60"
                  style={{ color: textFaint }}
                >
                  Cambiar email
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step: register ── */}
          {step === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-10 mt-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
                  style={{ background: hasCover ? primary : '#43352C' }}
                >
                  <Coffee size={22} color="white" strokeWidth={1.25} />
                </div>
                <h2
                  className="font-serif font-medium leading-tight mb-3"
                  style={{ fontSize: '2rem', color: textMain }}
                >
                  ¡Bienvenido/a!
                </h2>
                <p className="font-sans text-sm" style={{ color: textMuted }}>
                  Es tu primera vez. ¿Cómo te llamás?
                </p>
              </div>

              {signupCampaign && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-4 py-3.5 rounded-2xl flex items-center gap-3 mb-5"
                  style={hasCover
                    ? { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }
                    : { background: `${accent}14`, border: `1px solid ${accent}44` }
                  }
                >
                  <span className="text-xl">🎉</span>
                  <p className="font-sans text-xs" style={{ color: textMain }}>
                    Al registrarte sumás {signupBonusBannerText(signupCampaign).split(' de regalo')[0]} de regalo, ¡ya mismo!
                  </p>
                </motion.div>
              )}

              <form onSubmit={handleRegister} className="space-y-3">
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm font-sans placeholder:opacity-40 transition-opacity"
                  style={inputStyle}
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: hasCover ? primary : '#43352C' }}
                >
                  {loading ? 'Registrando…' : 'Unirme al programa'}
                </button>
                {/* Aviso al titular de los datos en el momento del registro: es la persona que
                    tiene que estar informada de que puede recibir promociones (del café y de
                    Sipo), no la cafetería. Ver /privacidad. */}
                <p className="font-sans text-[11px] leading-relaxed pt-1" style={{ color: textFaint }}>
                  Al registrarte aceptás los{' '}
                  <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: textMuted }}>
                    Términos
                  </a>{' '}
                  y recibir novedades de {cafe.name} y de Sipo. Podés darte de baja cuando quieras.{' '}
                  <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: textMuted }}>
                    Cómo usamos tus datos
                  </a>
                </p>
              </form>
            </motion.div>
          )}

          {/* ── Step: dashboard ── */}
          {step === 'dashboard' && customer && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 mt-2"
            >
              {/* Greeting */}
              <div className="pb-1 flex items-start justify-between">
                <div>
                  <p className="font-sans text-xs" style={{ color: textFaint }}>Hola,</p>
                  <p className="font-serif font-medium text-3xl leading-tight" style={{ color: textMain }}>
                    {customer.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setShowQr(true)}
                    className="p-2.5 rounded-xl transition-all"
                    style={hasCover
                      ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
                      : { background: '#F6F0E8', color: '#6B6B6B', border: '1px solid #E9DED1' }
                    }
                    title="Mi QR"
                  >
                    <QrCode size={16} />
                  </button>
                  <button
                    onClick={openProfile}
                    className="p-2.5 rounded-xl transition-all"
                    style={hasCover
                      ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
                      : { background: '#F6F0E8', color: '#6B6B6B', border: '1px solid #E9DED1' }
                    }
                    title="Mi perfil"
                  >
                    <UserRound size={16} />
                  </button>
                </div>
              </div>

              {/* Birthday banner */}
              {isBirthday(customer.birthdate) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-4 py-3.5 rounded-2xl flex items-center gap-3"
                  style={hasCover
                    ? { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }
                    : { background: '#fff7ed', border: '1px solid #fed7aa' }
                  }
                >
                  <span className="text-xl">🎂</span>
                  <div>
                    <p className="font-sans font-semibold text-sm" style={{ color: hasCover ? 'white' : '#9a3412' }}>
                      ¡Feliz cumpleaños, {customer.name.split(' ')[0]}!
                    </p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: hasCover ? 'rgba(255,255,255,0.65)' : '#c2410c' }}>
                      Mostrá esta pantalla al barista, puede haber una sorpresa para vos.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Campañas activas (el bono de bienvenida no aplica: ya está registrado) */}
              {activeCampaigns.filter(c => c.type !== 'signup_bonus').map(c => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-4 py-3 rounded-2xl flex items-center gap-3"
                  style={hasCover
                    ? { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }
                    : { background: `${accent}14`, border: `1px solid ${accent}44` }
                  }
                >
                  <span className="text-lg">{c.type === 'bonus_points' ? '🎁' : '🔥'}</span>
                  <div className="min-w-0">
                    <p className="font-sans font-semibold text-sm truncate" style={{ color: hasCover ? 'white' : '#43352C' }}>
                      {c.name}
                    </p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: hasCover ? 'rgba(255,255,255,0.65)' : '#6B6B6B' }}>
                      {campaignBannerText(c)}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Tab switcher */}
              {cafe.stampEnabled && cafe.pointsEnabled && (
                <div
                  className="flex p-1 rounded-2xl"
                  style={hasCover
                    ? { background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.18)' }
                    : { background: '#efe9e0' }
                  }
                >
                  {(['stamps', 'points'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="flex-1 py-2.5 rounded-xl font-sans text-sm font-medium transition-all duration-200"
                      style={
                        activeTab === tab
                          ? { background: hasCover ? 'rgba(255,255,255,0.22)' : 'white', color: hasCover ? primary : '#43352C' }
                          : { color: hasCover ? 'rgba(255,255,255,0.65)' : textFaint }
                      }
                    >
                      {tab === 'stamps' ? 'Sellos' : 'Puntos'}
                    </button>
                  ))}
                </div>
              )}

              {/* Stamp card */}
              {(activeTab === 'stamps' || !cafe.pointsEnabled) && cafe.stampEnabled && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-5 rounded-3xl"
                  style={card}
                >
                  {/* Header: título + contador sutil */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-sans font-semibold text-sm" style={{ color: textMain }}>
                      Tarjeta de sellos
                    </div>
                    <div className="font-sans text-sm font-semibold" style={{ color: textMuted }}>
                      {stamps}/{cafe.stampsRequired}
                    </div>
                  </div>
                  <div className="font-sans text-xs mb-3" style={{ color: textMuted }}>
                    Premio: {cafe.stampReward}
                  </div>
                  {stamps > 0 && customer?.loyalty?.stampsExpireAt && (
                    <div className="font-sans text-xs mb-3 flex items-center gap-1.5" style={{ color: textFaint }}>
                      <Clock size={11} />
                      Vencen el {new Date(customer.loyalty.stampsExpireAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </div>
                  )}

                  {/* Progress bar — más gruesa y visible */}
                  <div
                    className="w-full rounded-full mb-1 overflow-hidden"
                    style={{
                      height: '6px',
                      background: hasCover ? 'rgba(255,255,255,0.15)' : '#e8dece',
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((stamps / cafe.stampsRequired) * 100, 100)}%`, background: primary }}
                    />
                  </div>

                  {/* Stamp circles — grid dinámico según cantidad */}
                  {(() => {
                    const total = cafe.stampsRequired
                    const rows = total <= 6 ? 1 : total <= 12 ? 2 : total <= 18 ? 3 : 4
                    const cols = Math.ceil(total / rows)
                    return (
                      <div
                        className="grid gap-2.5 mb-1"
                        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                      >
                        {Array.from({ length: total }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={i < stamps ? { scale: 0 } : {}}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            className="aspect-square rounded-full flex items-center justify-center"
                            style={
                              i < stamps
                                ? { background: primary }
                                : hasCover
                                  ? { background: 'rgba(255,255,255,0.13)', border: '1.5px solid rgba(255,255,255,0.28)' }
                                  : { background: 'white', border: `1.5px solid ${primary}40` }
                            }
                          >
                            {i < stamps && (
                              <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }} />
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )
                  })()}

                  {stamps >= cafe.stampsRequired && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-5 py-3.5 rounded-2xl text-center font-sans text-sm font-semibold text-white"
                      style={{ background: primary }}
                    >
                      Mostrá esto al barista para canjear 🎉
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Points */}
              {(activeTab === 'points' || !cafe.stampEnabled) && cafe.pointsEnabled && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="p-5 rounded-3xl" style={card}>
                    <div
                      className="font-sans text-xs uppercase tracking-widest font-medium mb-3"
                      style={{ color: textFaint }}
                    >
                      Tus puntos
                    </div>
                    {/* Número grande con unidad visible */}
                    <div className="flex items-baseline gap-2 mb-1">
                      <div className="font-serif font-semibold leading-none" style={{ fontSize: '3.2rem', color: primary }}>
                        {Math.floor(points).toLocaleString()}
                      </div>
                      <div className="font-sans text-sm font-medium" style={{ color: hasCover ? 'rgba(255,255,255,0.5)' : '#6B6B6B' }}>
                        pts
                      </div>
                    </div>
                    {bonusPoints > 0 && (
                      <div className="font-sans text-xs mt-1.5 flex items-center gap-1.5" style={{ color: textFaint }}>
                        <span>🎁</span>
                        Incluye {Math.floor(bonusPoints).toLocaleString()} pts de regalo
                        {bonusExpireAt && ` · vencen el ${bonusExpireAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`}
                      </div>
                    )}
                  </div>

                  {cafe.rewards.length > 0 && (
                    <div>
                      <div className="font-sans font-semibold text-sm mb-3" style={{ color: textMain }}>
                        Canjeá tus puntos
                      </div>
                      <div className="space-y-2.5">
                        {cafe.rewards.map(reward => {
                          const canRedeem = points >= reward.pointsCost
                          const missing = reward.pointsCost - Math.floor(points)
                          const pct = Math.min((Math.floor(points) / reward.pointsCost) * 100, 100)
                          return (
                            <div
                              key={reward.id}
                              className="p-4 rounded-2xl"
                              style={canRedeem
                                ? { ...card, border: `1.5px solid ${accent}55` }
                                : card
                              }
                            >
                              <div className="flex items-center gap-3.5 mb-3">
                                <div
                                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                  style={hasCover
                                    ? { background: 'rgba(255,255,255,0.1)' }
                                    : { background: '#f3ede0' }
                                  }
                                >
                                  {reward.emoji || '🎁'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-sans font-semibold text-sm truncate" style={{ color: textMain }}>
                                    {reward.name}
                                  </div>
                                  {reward.description && (
                                    <div className="font-sans text-xs truncate" style={{ color: textMuted }}>
                                      {reward.description}
                                    </div>
                                  )}
                                  <div className="font-sans text-xs font-medium mt-0.5" style={{ color: textFaint }}>
                                    {reward.pointsCost.toLocaleString()} pts
                                  </div>
                                </div>
                                {canRedeem ? (
                                  <div
                                    className="font-sans text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                                    style={{ background: `${accent}18`, color: accent }}
                                  >
                                    ¡Canjeá!
                                  </div>
                                ) : (
                                  <div className="font-sans text-xs text-right flex-shrink-0 leading-tight" style={{ color: textFaint }}>
                                    Faltan<br />
                                    <span className="font-bold text-sm" style={{ color: hasCover ? 'rgba(255,255,255,0.75)' : '#43352C' }}>
                                      {missing.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {/* Mini barra de progreso hacia el reward */}
                              {!canRedeem && (
                                <div>
                                  <div
                                    className="w-full rounded-full overflow-hidden"
                                    style={{ height: '4px', background: hasCover ? 'rgba(255,255,255,0.12)' : '#e8dece' }}
                                  >
                                    <div
                                      className="h-full rounded-full transition-all duration-700"
                                      style={{ width: `${pct}%`, background: accent }}
                                    />
                                  </div>
                                  <div className="font-sans text-xs mt-1" style={{ color: textFaint }}>
                                    {Math.floor(pct)}% · necesitás {reward.pointsCost.toLocaleString()} pts
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <p className="font-sans text-center text-xs mt-4" style={{ color: textFaint }}>
                        Mostrá esta pantalla al barista para canjear.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Transaction history */}
              {customer.transactions.length > 0 && (
                <div className="pt-2">
                  <div
                    className="font-sans text-xs font-medium uppercase tracking-wider mb-3"
                    style={{ color: textFaint }}
                  >
                    Historial
                  </div>
                  <div className="space-y-0">
                    {customer.transactions.map(tx => {
                      const { text, value, positive } = txLabel(tx)
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between py-3"
                          style={{ borderBottom: hasCover ? '1px solid rgba(255,255,255,0.07)' : '1px solid #f0e9de' }}
                        >
                          <div>
                            <div className="font-sans text-sm font-medium" style={{ color: textMain }}>{text}</div>
                            <div className="font-sans text-xs" style={{ color: textFaint }}>{timeAgo(tx.createdAt)}</div>
                          </div>
                          <div
                            className="font-sans text-sm font-semibold"
                            style={{ color: positive ? primary : textMuted }}
                          >
                            {value}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Agregar la tarjeta al teléfono (PWA / wallet) */}
              <AddToWallet style={card} textMain={textMain} textMuted={textMuted} accent={accent} />

              {/* Reseña — pedir review de Google Maps */}
              {cafe.reviewUrl && (
                <a
                  href={cafe.reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl transition-all duration-200 hover:opacity-85 active:scale-[0.98] mt-2"
                  style={card}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}22` }}>
                    <Star size={15} style={{ color: accent }} fill={accent} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-sm" style={{ color: textMain }}>¿Disfrutás tu café?</div>
                    <div className="font-sans text-xs" style={{ color: textMuted }}>Dejanos una reseña, nos ayuda un montón ⭐</div>
                  </div>
                </a>
              )}

              {/* Invitá y ganá — referidos */}
              {cafe.referralEnabled && referralCode && (
                <div className="p-4 rounded-2xl mt-2" style={card}>
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: `${accent}22` }}>
                      🤝
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-semibold text-sm" style={{ color: textMain }}>Invitá y ganá</div>
                      <div className="font-sans text-xs" style={{ color: textMuted }}>
                        Cuando tu amigo haga su primera compra, vos ganás {referralRewardLabel}.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-xl font-sans text-xs truncate"
                      style={hasCover
                        ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.75)' }
                        : { background: '#F6F0E8', border: '1px solid #E9DED1', color: '#6B6B6B' }
                      }
                    >
                      {referralLink.replace(/^https?:\/\//, '')}
                    </div>
                    <button
                      onClick={copyReferral}
                      className="p-2.5 rounded-xl transition-all active:scale-95 flex-shrink-0"
                      style={hasCover
                        ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }
                        : { background: '#F6F0E8', color: '#6B6B6B', border: '1px solid #E9DED1' }
                      }
                      title="Copiar link"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={shareReferral}
                      className="p-2.5 rounded-xl text-white transition-all active:scale-95 flex-shrink-0"
                      style={{ background: hasCover ? primary : '#43352C' }}
                      title="Compartir"
                    >
                      <Share2 size={15} />
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ── Step: profile ── */}
          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-8 mt-2 flex items-center gap-3">
                {!justRegistered && (
                  <button
                    onClick={() => setStep('dashboard')}
                    className="p-2 rounded-xl transition-all"
                    style={hasCover
                      ? { background: 'rgba(255,255,255,0.1)', color: 'white' }
                      : { background: '#F6F0E8', color: '#43352C', border: '1px solid #E9DED1' }
                    }
                  >
                    <ArrowLeft size={17} />
                  </button>
                )}
                <div>
                  <p className="font-sans text-xs uppercase tracking-widest font-medium" style={{ color: textFaint }}>
                    {justRegistered ? '¡Ya sos parte!' : 'Tu cuenta'}
                  </p>
                  <p className="font-serif font-medium text-lg leading-tight" style={{ color: textMain }}>
                    {justRegistered ? 'Contanos un poco más de vos' : 'Mi perfil'}
                  </p>
                </div>
              </div>

              {justRegistered && (
                <p className="font-sans text-sm mb-6 -mt-4" style={{ color: textMuted }}>
                  Opcional: así {cafe.name} te puede saludar por tu cumple o contactarte por WhatsApp. Lo podés completar cuando quieras desde tu perfil.
                </p>
              )}

              <form onSubmit={handleProfileSave} className="space-y-3">

                {/* Email (read-only) */}
                <div>
                  <label className="font-sans text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: textFaint }}>
                    Email
                  </label>
                  <div
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                    style={{ ...inputStyle, opacity: 0.65 }}
                  >
                    <Mail size={15} style={{ color: textFaint, flexShrink: 0 }} />
                    <span className="flex-1 text-sm font-sans" style={{ color: textMain }}>
                      {customer?.email}
                    </span>
                    <span className="font-sans text-xs" style={{ color: textFaint }}>No editable</span>
                  </div>
                </div>

                {/* Teléfono (opcional) */}
                <div>
                  <label className="font-sans text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: textFaint }}>
                    Teléfono (opcional)
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                    <Phone size={15} style={{ color: textFaint, flexShrink: 0 }} />
                    <input
                      type="tel"
                      placeholder="+54 9 11 1234-5678"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      className="flex-1 outline-none text-sm bg-transparent font-sans placeholder:opacity-40"
                      style={{ color: textMain }}
                    />
                  </div>
                </div>

                {/* Fecha de nacimiento — solo se puede setear una vez */}
                <div>
                  <label className="font-sans text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: textFaint }}>
                    Fecha de nacimiento
                  </label>
                  {customer?.birthdate ? (
                    <div
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                      style={{ ...inputStyle, opacity: 0.65 }}
                    >
                      <Cake size={15} style={{ color: textFaint, flexShrink: 0 }} />
                      <span className="flex-1 text-sm font-sans" style={{ color: textMain }}>
                        {new Date(customer.birthdate).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                      </span>
                      <span className="font-sans text-xs" style={{ color: textFaint }}>No editable</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                      <Cake size={15} style={{ color: textFaint, flexShrink: 0 }} />
                      <input
                        type="date"
                        value={profileForm.birthdate}
                        onChange={e => setProfileForm(p => ({ ...p, birthdate: e.target.value }))}
                        className="flex-1 outline-none text-sm bg-transparent font-sans"
                        style={{ color: profileForm.birthdate ? textMain : textFaint }}
                      />
                    </div>
                  )}
                  {!customer?.birthdate && (
                    <p className="font-sans text-xs mt-1.5" style={{ color: textFaint }}>
                      Una vez guardada no se puede cambiar.
                    </p>
                  )}
                </div>

                {/* Café favorito */}
                <div>
                  <label className="font-sans text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: textFaint }}>
                    Café favorito
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                    <Heart size={15} style={{ color: textFaint, flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Cortado, flat white…"
                      value={profileForm.favoriteDrink}
                      onChange={e => setProfileForm(p => ({ ...p, favoriteDrink: e.target.value }))}
                      className="flex-1 outline-none text-sm bg-transparent font-sans placeholder:opacity-40"
                      style={{ color: textMain }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-sans font-semibold text-white text-sm transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-50 mt-2"
                  style={{ background: hasCover ? primary : '#43352C' }}
                >
                  {loading ? 'Guardando…' : justRegistered ? 'Guardar y continuar' : 'Guardar cambios'}
                </button>

                {justRegistered ? (
                  <button
                    type="button"
                    onClick={skipProfile}
                    className="w-full py-3 rounded-2xl font-sans text-sm transition-all hover:opacity-70"
                    style={hasCover ? { color: 'rgba(255,255,255,0.6)' } : { color: '#9B9089' }}
                  >
                    Ahora no, quiero ver mi tarjeta
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-3 rounded-2xl font-sans text-sm flex items-center justify-center gap-2 transition-all hover:opacity-70"
                    style={hasCover
                      ? { color: 'rgba(255,255,255,0.45)' }
                      : { color: '#a8a29e' }
                    }
                  >
                    <LogOut size={14} />
                    Cerrar sesión
                  </button>
                )}
              </form>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Los clientes que ya estaban registrados nunca pasan por la pantalla de alta, así que
            no vieron el aviso de datos: acá lo tienen siempre a mano desde su propia tarjeta. */}
        {(step === 'dashboard' || step === 'profile') && (
          <p className="text-center font-sans text-[11px] mt-6" style={{ color: textFaint }}>
            <a
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: textFaint }}
            >
              Cómo usamos tus datos
            </a>
          </p>
        )}
      </div>

      {/* ── QR modal ── */}
      <AnimatePresence>
        {showQr && customer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowQr(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white rounded-3xl p-7 flex flex-col items-center gap-4 max-w-xs w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between">
                <div>
                  <p className="font-serif font-medium text-lg leading-tight" style={{ color: '#43352C' }}>Mi QR</p>
                  <p className="font-sans text-xs mt-0.5" style={{ color: '#9B9089' }}>Mostralo al barista para registrar tu visita</p>
                </div>
                <button
                  onClick={() => setShowQr(false)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ background: '#F6F0E8', color: '#6B6B6B' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: '#FCFBF8', border: '1px solid #E9DED1' }}>
                <QRCodeSVG
                  value={customer.email}
                  size={180}
                  fgColor="#43352C"
                  bgColor="transparent"
                  level="M"
                />
              </div>
              <p className="font-sans text-xs text-center" style={{ color: '#9B9089' }}>{customer.email}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
