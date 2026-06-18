import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPoints(points: number) {
  return Math.floor(points).toLocaleString()
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function sanitizePublicUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') throw new Error('Invalid URL')

  const trimmed = value.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid URL')
  }

  return url.toString()
}

export function sanitizeCustomLinks(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null

  const links = typeof value === 'string' ? JSON.parse(value || '[]') : value
  if (!Array.isArray(links)) throw new Error('Invalid links')

  const sanitized = links
    .map(link => {
      if (!link || typeof link !== 'object') throw new Error('Invalid links')
      const label = typeof link.label === 'string' ? link.label.trim() : ''
      const url = sanitizePublicUrl((link as { url?: unknown }).url)
      if (!label || !url) return null
      return { label, url }
    })
    .filter((link): link is { label: string; url: string } => Boolean(link))

  return JSON.stringify(sanitized)
}

export function darken(hex: string, amount = 20): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0xff) - amount)
  const b = Math.max(0, (num & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function lighten(hex: string, amount = 40): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ── Color harmony ──────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Genera 6 opciones de color de acento a partir del color primario.
 * Cubre distintos casos: claro, oscuro, dorado universal,
 * y tres variantes de armonía cromática.
 */
export function generateAccentOptions(primaryHex: string): string[] {
  try {
    const [h, s, l] = hexToHsl(primaryHex)
    const cl = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
    // Luminosidad contrastante respecto al primario
    const contrastL = l > 52 ? cl(l - 33, 16, 44) : cl(l + 35, 56, 80)

    return [
      // 1. Luminoso — misma familia, muy claro y suave
      hslToHex(h, cl(s * 0.55, 18, 48), cl(l + 44, 78, 91)),

      // 2. Oscuro — misma familia, muy profundo
      hslToHex(h, cl(s * 1.1, 52, 90), cl(l - 38, 8, 26)),

      // 3. Dorado cálido — tono ámbar universal, casi siempre combina bien
      hslToHex(38, 70, l > 55 ? 38 : 60),

      // 4. Análogo cálido (+28°)
      hslToHex((h + 28) % 360, cl(s + 5, 48, 82), contrastL),

      // 5. Análogo frío (−28°)
      hslToHex((h - 28 + 360) % 360, cl(s + 5, 48, 82), contrastL),

      // 6. Split-complementario (+150°) — armonioso pero diferente
      hslToHex((h + 150) % 360, cl(s, 42, 76), contrastL),
    ]
  } catch {
    return ['#F5E6D3', '#2C1810', '#D4A96A', '#C1440E', '#4A7C59', '#8B6F5E']
  }
}
