'use client'

import { useCallback, useRef, useState } from 'react'
import ApiKeysManager from './ApiKeysManager'
import BillingSection from './BillingSection'
import dynamic from 'next/dynamic'
const Cropper = dynamic<any>(() => import('react-easy-crop'), { ssr: false })
import toast from 'react-hot-toast'
import { Save, ExternalLink, Plus, Trash2, UserPlus, Key, Sparkles, Upload, X, ZoomIn, ZoomOut, AlertTriangle, Printer } from 'lucide-react'
import { generateAccentOptions } from '@/lib/utils'
import { DEFAULT_INACTIVE_MESSAGE, DEFAULT_COMPLETED_MESSAGE } from '@/lib/reengagement'
import type { PlanTiers } from '@/lib/plans'

type CropArea = { x: number; y: number; width: number; height: number }

async function getCroppedBlob(imageSrc: string, cropPx: CropArea): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = cropPx.width
      canvas.height = cropPx.height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, cropPx.width, cropPx.height)
      const srcX = Math.max(0, cropPx.x)
      const srcY = Math.max(0, cropPx.y)
      const srcRight = Math.min(img.naturalWidth, cropPx.x + cropPx.width)
      const srcBottom = Math.min(img.naturalHeight, cropPx.y + cropPx.height)
      const srcW = srcRight - srcX
      const srcH = srcBottom - srcY
      if (srcW > 0 && srcH > 0) {
        const dstX = srcX - cropPx.x
        const dstY = srcY - cropPx.y
        ctx.drawImage(img, srcX, srcY, srcW, srcH, dstX, dstY, srcW, srcH)
      }
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas error')), 'image/jpeg', 0.92)
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

interface Cafe {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  coverUrl: string | null
  primaryColor: string
  accentColor: string
  menuUrl: string | null
  mapsUrl: string | null
  instagramUrl: string | null
  whatsappUrl: string | null
  websiteUrl: string | null
  customLinks: string | null
  reviewUrl: string | null
  loyaltyEnabled: boolean
  stampEnabled: boolean
  stampsRequired: number
  stampReward: string
  minPurchaseForStamp: number
  stampExpiryDays: number
  pointsEnabled: boolean
  pointsPerPeso: number
  currencySymbol: string
  referralEnabled: boolean
  referralRewardType: string
  referralRewardAmount: number
  reengagementInactiveEnabled: boolean
  reengagementInactiveDays: number
  reengagementInactiveMessage: string | null
  reengagementCompletedEnabled: boolean
  reengagementCompletedDays: number
  reengagementCompletedMessage: string | null
  planTier: string
  pendingSubscriptionTier: string | null
  mpPreapprovalId: string | null
  mpPreapprovalStatus: string | null
  activeUntil: Date | string | null
  planChangeRequestedTier: string | null
  mpSubscriptionAmount: number | null
  pendingBillingSyncAt: Date | string | null
  mpPayerEmail: string | null
}

interface StaffMember {
  id: string
  name: string
  email: string
  createdAt: Date
}

interface Props {
  cafe: Cafe
  cafeStaff: StaffMember[]
  isSuperAdmin: boolean
  apiAllowed: boolean
  tiers: PlanTiers
  ownerEmail: string | null
  /** Cuántos clientes tienen cada cantidad de sellos — para el aviso al bajar el tope. */
  stampHistogram: { stamps: number; count: number }[]
}

// ── Shared input style ─────────────────────────────────────────────────────
const sInputClass = 'w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors'
const sInputStyle = { border: '1px solid #E9DED1', background: '#F6F0E8', color: '#43352C' }

// ── Subcomponents (defined outside to avoid recreating on each render) ─────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[24px] p-6"
      style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
    >
      <h2
        className="font-sans text-sm font-semibold tracking-tight mb-5 pb-4"
        style={{ color: '#43352C', borderBottom: '1px solid #F6F0E8' }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label
        className="font-sans text-xs font-medium uppercase tracking-wider mb-1.5 block"
        style={{ color: '#9B9089' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function SInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={sInputClass}
      style={sInputStyle}
    />
  )
}

function Toggle({ checked, onChange, label, primaryColor }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; primaryColor: string
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="font-sans text-sm font-medium" style={{ color: '#43352C' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
        style={{ background: checked ? primaryColor : '#E9DED1' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"
          style={{ left: checked ? '22px' : '2px' }}
        />
      </button>
    </div>
  )
}

function ImageUpload({
  value, onChange, label, hint, type, cafeSlug,
}: {
  value: string; onChange: (url: string) => void
  label: string; hint?: string; type: 'logo' | 'cover'; cafeSlug: string
}) {
  const [uploading, setUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPx, setCroppedAreaPx] = useState<CropArea | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const aspect = type === 'logo' ? 1 : 16 / 9

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setCropSrc(reader.result as string); setCrop({ x: 0, y: 0 }); setZoom(1) }
    reader.readAsDataURL(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const onCropComplete = useCallback((_: unknown, px: CropArea) => { setCroppedAreaPx(px) }, [])

  async function handleConfirm() {
    if (!cropSrc || !croppedAreaPx) return
    setUploading(true)
    setCropSrc(null)
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPx)
      const fd = new FormData()
      fd.append('file', new File([blob], `${type}.jpg`, { type: 'image/jpeg' }))
      fd.append('type', type)
      fd.append('cafeSlug', cafeSlug)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) { onChange(data.url); toast.success('Imagen subida') }
      else toast.error(data.error || 'Error al subir')
    } catch { toast.error('Error al procesar la imagen') }
    finally { setUploading(false) }
  }

  return (
    <div className="mb-4">
      <label className="font-sans text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: '#9B9089' }}>
        {label}
      </label>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* Crop modal — dark overlay is intentional */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="relative flex-1">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              minZoom={0.1}
              maxZoom={4}
              aspect={aspect}
              cropShape={type === 'logo' ? 'round' : 'rect'}
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="bg-zinc-900 px-5 py-4 flex items-center gap-4">
            <ZoomOut size={16} className="text-zinc-400 flex-shrink-0" />
            <input
              type="range" min={0.1} max={4} step={0.01}
              value={zoom} onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <ZoomIn size={16} className="text-zinc-400 flex-shrink-0" />
            <div className="flex gap-2 ml-4">
              <button type="button" onClick={() => setCropSrc(null)}
                className="px-4 py-2 rounded-xl border border-zinc-600 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirm}
                className="px-5 py-2 rounded-xl bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 transition-colors">
                Aplicar recorte
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative flex-shrink-0">
            <img
              src={value}
              alt=""
              className={type === 'logo' ? 'w-14 h-14 object-cover rounded-full' : 'w-24 h-14 object-cover rounded-xl'}
              style={{ border: '1px solid #E9DED1' }}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X size={10} color="white" />
            </button>
          </div>
        ) : (
          <div
            className={`flex-shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center ${type === 'logo' ? 'w-14 h-14' : 'w-24 h-14'}`}
            style={{ borderColor: '#E9DED1', background: '#FCFBF8' }}
          >
            <Upload size={16} style={{ color: '#C0B4A8' }} />
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="font-sans px-3.5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
          style={{ border: '1px solid #E9DED1', color: '#6B6B6B', background: '#F6F0E8' }}
        >
          <Upload size={13} />
          {uploading ? 'Subiendo…' : value ? 'Cambiar' : 'Subir imagen'}
        </button>
      </div>
      {hint && <p className="font-sans text-xs mt-1.5" style={{ color: '#9B9089' }}>{hint}</p>}
    </div>
  )
}

export default function SettingsForm({ cafe, cafeStaff: initialStaff, isSuperAdmin, apiAllowed, tiers, ownerEmail, stampHistogram }: Props) {
  const [form, setForm] = useState({
    name: cafe.name,
    description: cafe.description || '',
    logoUrl: cafe.logoUrl || '',
    coverUrl: cafe.coverUrl || '',
    primaryColor: cafe.primaryColor,
    accentColor: cafe.accentColor,
    menuUrl: cafe.menuUrl || '',
    mapsUrl: cafe.mapsUrl || '',
    instagramUrl: cafe.instagramUrl || '',
    whatsappUrl: cafe.whatsappUrl || '',
    websiteUrl: cafe.websiteUrl || '',
    reviewUrl: cafe.reviewUrl || '',
    loyaltyEnabled: cafe.loyaltyEnabled,
    stampEnabled: cafe.stampEnabled,
    stampsRequired: cafe.stampsRequired,
    stampReward: cafe.stampReward,
    minPurchaseForStamp: cafe.minPurchaseForStamp,
    stampExpiryDays: cafe.stampExpiryDays,
    pointsEnabled: cafe.pointsEnabled,
    pointsPerPeso: cafe.pointsPerPeso,
    currencySymbol: cafe.currencySymbol,
    referralEnabled: cafe.referralEnabled,
    referralRewardType: cafe.referralRewardType,
    referralRewardAmount: cafe.referralRewardAmount,
    reengagementInactiveEnabled: cafe.reengagementInactiveEnabled,
    reengagementInactiveDays: cafe.reengagementInactiveDays,
    reengagementInactiveMessage: cafe.reengagementInactiveMessage ?? DEFAULT_INACTIVE_MESSAGE,
    reengagementCompletedEnabled: cafe.reengagementCompletedEnabled,
    reengagementCompletedDays: cafe.reengagementCompletedDays,
    reengagementCompletedMessage: cafe.reengagementCompletedMessage ?? DEFAULT_COMPLETED_MESSAGE,
  })
  const [customLinks, setCustomLinks] = useState<{ label: string; url: string }[]>(
    cafe.customLinks ? JSON.parse(cafe.customLinks) : []
  )
  const [saving, setSaving] = useState(false)
  const [accentOptions, setAccentOptions] = useState<string[]>([])

  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [addingStaff, setAddingStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' })
  const [staffLoading, setStaffLoading] = useState(false)

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  function set(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Clientes que hoy tienen MÁS sellos que el tope elegido: son los que perderían el excedente.
  // Se calcula sobre el histograma que vino del servidor, sin pedirle nada en cada tecla.
  const clientesConExcedente = stampHistogram
    .filter(g => g.stamps > form.stampsRequired)
    .reduce((n, g) => n + g.count, 0)
  const maxSellosActuales = stampHistogram.reduce((m, g) => Math.max(m, g.stamps), 0)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/cafe/${cafe.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, customLinks: JSON.stringify(customLinks) }),
      })
      if (res.ok) toast.success('Configuración guardada')
      else {
        // El server valida sellos, puntos, colores y URLs: mostrar SU mensaje, no uno genérico.
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al guardar')
      }
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  async function addStaff() {
    if (!newStaff.name || !newStaff.email || !newStaff.password) return
    if (newStaff.password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    setStaffLoading(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newStaff, cafeId: cafe.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setStaff([data, ...staff])
        setNewStaff({ name: '', email: '', password: '' })
        setAddingStaff(false)
        toast.success('Cajero creado')
      } else {
        toast.error(data.error || 'Error al crear cajero')
      }
    } catch { toast.error('Error de conexión') }
    finally { setStaffLoading(false) }
  }

  async function removeStaff(id: string, name: string) {
    if (!confirm(`¿Eliminar al cajero ${name}?`)) return
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStaff(staff.filter(s => s.id !== id))
      toast.success('Cajero eliminado')
    } else {
      toast.error('Error al eliminar')
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (pwForm.next.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Contraseña actualizada')
        setPwForm({ current: '', next: '', confirm: '' })
      } else {
        toast.error(data.error || 'Error al cambiar contraseña')
      }
    } catch { toast.error('Error de conexión') }
    finally { setPwLoading(false) }
  }

  return (
    <form onSubmit={handleSave} className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-serif font-medium mb-1" style={{ fontSize: '1.7rem', color: '#43352C' }}>Configuración</h1>
          <a
            href={`/${cafe.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-xs flex items-center gap-1 transition-colors"
            style={{ color: '#9B9089' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#43352C'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9B9089'}
          >
            /{cafe.slug} <ExternalLink size={10} />
          </a>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all"
          style={{ background: form.primaryColor }}
        >
          <Save size={14} />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-4">

        {/* QR Codes */}
        <div
          className="rounded-[24px] p-6"
          style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <h2
            className="font-sans text-sm font-semibold tracking-tight mb-5 pb-4"
            style={{ color: '#43352C', borderBottom: '1px solid #F6F0E8' }}
          >
            Compartir mi página
          </h2>
          <div className="flex gap-8 flex-wrap">
            <div className="text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/${cafe.slug}/loyalty`)}&bgcolor=FCFBF8&color=43352C&margin=6`}
                alt="QR Fidelidad"
                className="w-32 h-32 rounded-xl mb-2 mx-auto"
                style={{ border: '1px solid #E9DED1' }}
              />
              <div className="font-sans text-xs font-medium" style={{ color: '#43352C' }}>Programa de fidelidad</div>
              <div className="font-mono text-xs" style={{ color: '#9B9089' }}>/{cafe.slug}/loyalty</div>
            </div>
            <div className="text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/${cafe.slug}`)}&bgcolor=FCFBF8&color=43352C&margin=6`}
                alt="QR Página principal"
                className="w-32 h-32 rounded-xl mb-2 mx-auto"
                style={{ border: '1px solid #E9DED1' }}
              />
              <div className="font-sans text-xs font-medium" style={{ color: '#43352C' }}>Página principal</div>
              <div className="font-mono text-xs" style={{ color: '#9B9089' }}>/{cafe.slug}</div>
            </div>
          </div>
          <div
            className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl p-4"
            style={{ background: '#F6F0E8', border: '1px solid #E9DED1' }}
          >
            <div className="flex-1">
              <div className="font-sans text-sm font-semibold" style={{ color: '#43352C' }}>Cartel para el mostrador</div>
              <p className="font-sans text-xs mt-1 leading-relaxed" style={{ color: '#6B6B6B' }}>
                Generá una versión plana o autoportante con tu logo, colores y QR. Usa la última configuración guardada.
              </p>
            </div>
            <a
              href={`/${cafe.slug}/cartel`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-sans font-semibold text-white text-xs hover:opacity-90 transition-opacity"
              style={{ background: form.primaryColor }}
            >
              <Printer size={14} /> Preparar cartel
            </a>
          </div>
        </div>

        <Section title="Identidad del café">
          <Field label="Nombre">
            <SInput value={form.name} onChange={v => set('name', v)} placeholder="Mi Cafetería" />
          </Field>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Una breve descripción de tu café…"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors resize-none"
              style={sInputStyle}
            />
          </Field>
          <ImageUpload
            value={form.logoUrl} onChange={v => set('logoUrl', v)}
            label="Logo" type="logo" cafeSlug={cafe.slug}
          />
          <ImageUpload
            value={form.coverUrl} onChange={v => set('coverUrl', v)}
            label="Imagen de fondo" type="cover" cafeSlug={cafe.slug}
            hint="Se muestra detrás de toda la página en la vista del cliente."
          />
          <div className="space-y-3">
            <Field label="Color principal">
              <div
                className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                style={{ border: '1px solid #E9DED1', background: '#F6F0E8' }}
              >
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={e => set('primaryColor', e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                />
                <span className="font-mono text-sm" style={{ color: '#6B6B6B' }}>{form.primaryColor}</span>
              </div>
            </Field>

            <Field label="Color de acento">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 flex-1"
                    style={{ border: '1px solid #E9DED1', background: '#F6F0E8' }}
                  >
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={e => { set('accentColor', e.target.value); setAccentOptions([]) }}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <span className="font-mono text-sm" style={{ color: '#6B6B6B' }}>{form.accentColor}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccentOptions(generateAccentOptions(form.primaryColor))}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-xs font-medium transition-colors whitespace-nowrap"
                    style={{ border: '1px solid #E9DED1', color: '#6B6B6B', background: '#F6F0E8' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#EDE3D8'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F6F0E8'}
                  >
                    <Sparkles size={12} /> Generar opciones
                  </button>
                </div>

                {accentOptions.length > 0 && (
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: '#FCFBF8', border: '1px solid #E9DED1' }}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {accentOptions.map((color, i) => {
                        const labels = ['Luminoso', 'Oscuro', 'Dorado', 'Análogo +', 'Análogo −', 'Split']
                        const isSelected = form.accentColor.toLowerCase() === color.toLowerCase()
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { set('accentColor', color); setAccentOptions([]) }}
                            className="flex flex-col items-center gap-1.5 group"
                          >
                            <div
                              className="w-full h-10 rounded-xl transition-all duration-150 group-hover:scale-[1.04]"
                              style={{
                                background: color,
                                boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                              }}
                            />
                            <span className="font-sans text-[10px] leading-tight" style={{ color: '#9B9089' }}>{labels[i]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Field>
          </div>
        </Section>

        <Section title="Links de la página">
          <Field label="URL del menú"><SInput value={form.menuUrl} onChange={v => set('menuUrl', v)} placeholder="https://…" /></Field>
          <Field label="Google Maps"><SInput value={form.mapsUrl} onChange={v => set('mapsUrl', v)} placeholder="https://maps.google.com/…" /></Field>
          <Field label="Instagram"><SInput value={form.instagramUrl} onChange={v => set('instagramUrl', v)} placeholder="https://instagram.com/…" /></Field>
          <Field label="WhatsApp"><SInput value={form.whatsappUrl} onChange={v => set('whatsappUrl', v)} placeholder="https://wa.me/…" /></Field>
          <Field label="Sitio web"><SInput value={form.websiteUrl} onChange={v => set('websiteUrl', v)} placeholder="https://…" /></Field>
          <Field label="Link de reseña (Google Maps)">
            <SInput value={form.reviewUrl} onChange={v => set('reviewUrl', v)} placeholder="https://g.page/r/…/review" />
            <p className="font-sans text-xs mt-1.5 leading-relaxed" style={{ color: '#9B9089' }}>
              Con esto, tus clientes ven un botón para dejarte una reseña. Para conseguir el link:
              buscá tu cafetería en Google, entrá a tu perfil de negocio → “Pedí reseñas” / “Compartir”,
              y copiá el enlace directo (suele empezar con <span className="font-mono">g.page/r/</span>).
            </p>
          </Field>
          <div>
            <div
              className="font-sans text-xs font-medium uppercase tracking-wider mb-3"
              style={{ color: '#9B9089' }}
            >
              Links personalizados
            </div>
            {customLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={e => { const u = [...customLinks]; u[i] = { ...u[i], label: e.target.value }; setCustomLinks(u) }}
                  placeholder="Etiqueta"
                  className="w-28 px-3 py-2 rounded-xl font-sans outline-none text-sm transition-colors"
                  style={sInputStyle}
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={e => { const u = [...customLinks]; u[i] = { ...u[i], url: e.target.value }; setCustomLinks(u) }}
                  placeholder="URL"
                  className="flex-1 px-3 py-2 rounded-xl font-sans outline-none text-sm transition-colors"
                  style={sInputStyle}
                />
                <button
                  type="button"
                  onClick={() => setCustomLinks(customLinks.filter((_, j) => j !== i))}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCustomLinks([...customLinks, { label: '', url: '' }])}
              className="flex items-center gap-1.5 font-sans text-sm mt-1 transition-colors"
              style={{ color: '#9B9089' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#43352C'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9B9089'}
            >
              <Plus size={13} /> Agregar link
            </button>
          </div>
        </Section>

        <Section title="Programa de beneficios">
          <Toggle checked={form.loyaltyEnabled} onChange={v => set('loyaltyEnabled', v)} label="Activar programa de beneficios" primaryColor={form.primaryColor} />
          {form.loyaltyEnabled && (
            <div className="mt-4 space-y-3 pt-4" style={{ borderTop: '1px solid #F6F0E8' }}>
              <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: '1px solid #F6F0E8' }}>
                <Toggle checked={form.stampEnabled} onChange={v => set('stampEnabled', v)} label="Tarjeta de sellos" primaryColor={form.primaryColor} />
                {form.stampEnabled && (
                  <div className="mt-3 space-y-3 pt-3" style={{ borderTop: '1px solid #E9DED1' }}>
                    <Field label="Sellos para completar">
                      <input
                        type="number" min={3} max={20}
                        value={form.stampsRequired}
                        onChange={e => set('stampsRequired', parseInt(e.target.value))}
                        className="w-20 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                        style={sInputStyle}
                      />
                    </Field>
                    {/* Canjear deja la tarjeta en 0, no resta: si bajás el número, a quien ya tenga
                        más sellos que el nuevo tope se le pierde el excedente al canjear. Nada
                        reescribe las tarjetas existentes cuando cambiás este valor, así que el
                        efecto es invisible salvo que se avise acá. */}
                    {clientesConExcedente > 0 && (
                      <div
                        className="flex items-start gap-2 p-3 rounded-xl"
                        style={{ background: '#FDF6EC', border: '1px solid #EBD9BE' }}
                      >
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#B98A2E' }} />
                        <p className="font-sans text-xs leading-relaxed" style={{ color: '#7A6034' }}>
                          {clientesConExcedente === 1
                            ? 'Hay 1 cliente con más sellos'
                            : `Hay ${clientesConExcedente} clientes con más sellos`}{' '}
                          que este número (hasta {maxSellosActuales}). Al canjear, la tarjeta vuelve
                          a cero: el excedente <strong>no pasa</strong> a la tarjeta siguiente.
                          {' '}Si guardás así, esos sellos de más se pierden cuando canjeen.
                        </p>
                      </div>
                    )}
                    <Field label="Recompensa al completar">
                      <SInput value={form.stampReward} onChange={v => set('stampReward', v)} placeholder="1 café gratis" />
                    </Field>
                    <Field label="Compra mínima para sello">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-sm" style={{ color: '#6B6B6B' }}>{form.currencySymbol}</span>
                        <input
                          type="number" min={0} step={1}
                          value={form.minPurchaseForStamp}
                          onChange={e => set('minPurchaseForStamp', parseFloat(e.target.value) || 0)}
                          className="w-28 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                          style={sInputStyle}
                        />
                      </div>
                      <p className="font-sans text-xs mt-1" style={{ color: '#9B9089' }}>0 = sin mínimo.</p>
                    </Field>
                    <Field label="Vencimiento de sellos (días)">
                      <input
                        type="number" min={0} max={365} step={1}
                        value={form.stampExpiryDays}
                        onChange={e => set('stampExpiryDays', parseInt(e.target.value) || 0)}
                        className="w-24 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                        style={sInputStyle}
                      />
                      <p className="font-sans text-xs mt-1" style={{ color: '#9B9089' }}>
                        0 = no vencen. Con un valor, cada sello nuevo renueva el plazo de todos, y se avisa por email 7 días antes.
                      </p>
                    </Field>
                  </div>
                )}
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: '1px solid #F6F0E8' }}>
                <Toggle checked={form.pointsEnabled} onChange={v => set('pointsEnabled', v)} label="Sistema de puntos" primaryColor={form.primaryColor} />
                {form.pointsEnabled && (
                  <div className="mt-3 space-y-3 pt-3" style={{ borderTop: '1px solid #E9DED1' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Símbolo de moneda">
                        <SInput value={form.currencySymbol} onChange={v => set('currencySymbol', v)} placeholder="$" />
                      </Field>
                      <Field label="Puntos por unidad">
                        <input
                          type="number" min={0.01} step={0.01}
                          value={form.pointsPerPeso}
                          onChange={e => set('pointsPerPeso', parseFloat(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                          style={sInputStyle}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: '1px solid #F6F0E8' }}>
                <Toggle checked={form.referralEnabled} onChange={v => set('referralEnabled', v)} label="Referidos (invitá y ganá)" primaryColor={form.primaryColor} />
                {form.referralEnabled && (
                  <div className="mt-3 space-y-3 pt-3" style={{ borderTop: '1px solid #E9DED1' }}>
                    <Field label="Premio para quien invita">
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={1} step={1}
                          value={form.referralRewardAmount}
                          onChange={e => set('referralRewardAmount', parseFloat(e.target.value) || 1)}
                          className="w-24 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                          style={sInputStyle}
                        />
                        <select
                          value={form.referralRewardType}
                          onChange={e => set('referralRewardType', e.target.value)}
                          className="px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                          style={sInputStyle}
                        >
                          {form.pointsEnabled && <option value="points">puntos</option>}
                          {form.stampEnabled && <option value="stamps">sellos</option>}
                        </select>
                      </div>
                      <p className="font-sans text-xs mt-1" style={{ color: '#9B9089' }}>
                        Se acredita recién cuando el invitado hace su primera compra (evita abusos).
                      </p>
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>

        <Section title="Reactivación de clientes">
          <p className="font-sans text-xs mb-4" style={{ color: '#9B9089' }}>
            Emails automáticos para que tus clientes vuelvan. Cada uno se apaga por default y se manda una sola vez por racha — si el cliente vuelve a sumar sellos o canjea, se puede volver a avisar más adelante.
          </p>
          <div className="space-y-3">
            <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: '1px solid #F6F0E8' }}>
              <Toggle
                checked={form.reengagementInactiveEnabled}
                onChange={v => set('reengagementInactiveEnabled', v)}
                label="Avisar por inactividad"
                primaryColor={form.primaryColor}
              />
              {form.reengagementInactiveEnabled && (
                <div className="mt-3 space-y-3 pt-3" style={{ borderTop: '1px solid #E9DED1' }}>
                  <Field label="Días desde el último sello">
                    <input
                      type="number" min={1} max={365} step={1}
                      value={form.reengagementInactiveDays}
                      onChange={e => set('reengagementInactiveDays', parseInt(e.target.value) || 1)}
                      className="w-24 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                      style={sInputStyle}
                    />
                    {form.stampExpiryDays > 0 && (
                      <p className="font-sans text-xs mt-1" style={{ color: '#9B9089' }}>
                        Como tenés vencimiento de sellos activado, mientras a un cliente le corra esa cuenta regresiva no le llega este aviso — le llega el de sellos por vencer en su lugar.
                      </p>
                    )}
                  </Field>
                  <Field label="Mensaje">
                    <textarea
                      value={form.reengagementInactiveMessage ?? ''}
                      onChange={e => set('reengagementInactiveMessage', e.target.value)}
                      rows={3}
                      maxLength={600}
                      className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors resize-none"
                      style={sInputStyle}
                    />
                  </Field>
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#FCFBF8', border: '1px solid #F6F0E8' }}>
              <Toggle
                checked={form.reengagementCompletedEnabled}
                onChange={v => set('reengagementCompletedEnabled', v)}
                label="Avisar por tarjeta completa sin canjear"
                primaryColor={form.primaryColor}
              />
              {form.reengagementCompletedEnabled && (
                <div className="mt-3 space-y-3 pt-3" style={{ borderTop: '1px solid #E9DED1' }}>
                  <Field label="Días desde que se completó">
                    <input
                      type="number" min={1} max={365} step={1}
                      value={form.reengagementCompletedDays}
                      onChange={e => set('reengagementCompletedDays', parseInt(e.target.value) || 1)}
                      className="w-24 px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors"
                      style={sInputStyle}
                    />
                  </Field>
                  <Field label="Mensaje">
                    <textarea
                      value={form.reengagementCompletedMessage ?? ''}
                      onChange={e => set('reengagementCompletedMessage', e.target.value)}
                      rows={3}
                      maxLength={600}
                      className="w-full px-3.5 py-2.5 rounded-xl font-sans outline-none text-sm transition-colors resize-none"
                      style={sInputStyle}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section title="Facturación">
          <BillingSection
            cafeSlug={cafe.slug}
            planTier={cafe.planTier}
            pendingSubscriptionTier={cafe.pendingSubscriptionTier}
            mpPreapprovalId={cafe.mpPreapprovalId}
            mpPreapprovalStatus={cafe.mpPreapprovalStatus}
            activeUntil={cafe.activeUntil ? new Date(cafe.activeUntil).toISOString() : null}
            planChangeRequestedTier={cafe.planChangeRequestedTier}
            tiers={tiers}
            mpPayerEmail={cafe.mpPayerEmail}
            ownerEmail={ownerEmail}
            mpSubscriptionAmount={cafe.mpSubscriptionAmount}
            pendingBillingSyncAt={cafe.pendingBillingSyncAt ? new Date(cafe.pendingBillingSyncAt).toISOString() : null}
            primaryColor={form.primaryColor}
          />
        </Section>

        <Section title="Integraciones (API)">
          <ApiKeysManager cafeId={cafe.id} primaryColor={form.primaryColor} apiAllowed={apiAllowed} />
        </Section>

        {/* Cajeros */}
        <div
          className="rounded-[24px] p-6"
          style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
        >
          <div
            className="flex items-center justify-between pb-4 mb-5"
            style={{ borderBottom: '1px solid #F6F0E8' }}
          >
            <h2 className="font-sans text-sm font-semibold" style={{ color: '#43352C' }}>Cajeros</h2>
            <button
              type="button"
              onClick={() => setAddingStaff(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-sans text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ background: form.primaryColor }}
            >
              <UserPlus size={13} /> Agregar cajero
            </button>
          </div>

          {addingStaff && (
            <div
              className="mb-5 p-4 rounded-xl space-y-2.5"
              style={{ background: '#FCFBF8', border: '1px solid #E9DED1' }}
            >
              <div className="font-sans text-xs font-semibold mb-3" style={{ color: '#43352C' }}>Nuevo cajero</div>
              <input
                type="text" placeholder="Nombre completo" value={newStaff.name}
                onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                className={sInputClass} style={sInputStyle}
              />
              <input
                type="email" placeholder="Email" value={newStaff.email}
                onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                className={sInputClass} style={sInputStyle}
              />
              <input
                type="text" placeholder="Contraseña temporal (mín. 8 caracteres)" value={newStaff.password}
                onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                className={`${sInputClass} font-mono`} style={sInputStyle}
              />
              <p className="font-sans text-xs" style={{ color: '#9B9089' }}>
                El cajero deberá cambiar la contraseña en su primer inicio de sesión.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddingStaff(false)}
                  className="px-4 py-2 rounded-xl font-sans text-sm transition-colors"
                  style={{ border: '1px solid #E9DED1', color: '#6B6B6B', background: '#F6F0E8' }}
                >
                  Cancelar
                </button>
                <button
                  type="button" onClick={addStaff} disabled={staffLoading}
                  className="flex-1 py-2 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                  style={{ background: form.primaryColor }}
                >
                  {staffLoading ? 'Creando…' : 'Crear cajero'}
                </button>
              </div>
            </div>
          )}

          {staff.length === 0 && !addingStaff ? (
            <p className="font-sans text-sm text-center py-4" style={{ color: '#9B9089' }}>No hay cajeros registrados.</p>
          ) : (
            <div className="space-y-2">
              {staff.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2.5 last:border-0"
                  style={{ borderBottom: '1px solid #F6F0E8' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: '#F6F0E8', color: '#6B6B6B' }}
                  >
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-sm font-medium truncate" style={{ color: '#43352C' }}>{s.name}</div>
                    <div className="font-sans text-xs" style={{ color: '#9B9089' }}>{s.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStaff(s.id, s.name)}
                    className="p-1.5 rounded-xl transition-colors"
                    style={{ color: '#f87171' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        {!isSuperAdmin && (
          <div
            className="rounded-[24px] p-6"
            style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.04)' }}
          >
            <h2
              className="font-sans text-sm font-semibold tracking-tight mb-5 pb-4 flex items-center gap-2"
              style={{ color: '#43352C', borderBottom: '1px solid #F6F0E8' }}
            >
              <Key size={14} /> Cambiar contraseña
            </h2>
            <div className="space-y-3 max-w-sm">
              <input
                type="password" placeholder="Contraseña actual" value={pwForm.current}
                onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                className={sInputClass} style={sInputStyle}
              />
              <input
                type="password" placeholder="Nueva contraseña" value={pwForm.next}
                onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                className={sInputClass} style={sInputStyle}
              />
              <input
                type="password" placeholder="Confirmar nueva contraseña" value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                className={sInputClass} style={sInputStyle}
              />
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={pwLoading || !pwForm.current || !pwForm.next || !pwForm.confirm}
                className="px-5 py-2.5 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                style={{ background: form.primaryColor }}
              >
                {pwLoading ? 'Cambiando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit" disabled={saving}
          className="flex items-center gap-1.5 px-6 py-3 rounded-xl font-sans font-semibold text-white text-sm hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all"
          style={{ background: form.primaryColor }}
        >
          <Save size={14} />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
