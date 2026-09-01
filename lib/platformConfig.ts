import { prisma } from './prisma'

export type PlatformConfigData = {
  contactEmail: string | null
  whatsappNumber: string | null
  whatsappUrl: string | null
  instagramUrl: string | null
  xUrl: string | null
  graceDays: number
  capacityWarningPercent: number
  priceChangeNoticeDays: number
}

const DEFAULTS: PlatformConfigData = {
  contactEmail: null,
  whatsappNumber: null,
  whatsappUrl: null,
  instagramUrl: null,
  xUrl: null,
  graceDays: 7,
  capacityWarningPercent: 80,
  priceChangeNoticeDays: 14,
}

/** Lee la config singleton de la plataforma. Si no existe, devuelve defaults (sin escribir). */
export async function getPlatformConfig(): Promise<PlatformConfigData> {
  const cfg = await prisma.platformConfig.findUnique({ where: { id: 'singleton' } })
  if (!cfg) return DEFAULTS
  return {
    contactEmail: cfg.contactEmail,
    whatsappNumber: cfg.whatsappNumber,
    whatsappUrl: cfg.whatsappUrl,
    instagramUrl: cfg.instagramUrl,
    xUrl: cfg.xUrl,
    graceDays: cfg.graceDays,
    capacityWarningPercent: cfg.capacityWarningPercent,
    priceChangeNoticeDays: cfg.priceChangeNoticeDays,
  }
}

/** Arma la URL de WhatsApp a partir del link explícito o del número + mensaje opcional. */
export function buildWhatsappUrl(config: PlatformConfigData, message?: string): string | null {
  if (config.whatsappUrl) return config.whatsappUrl
  if (config.whatsappNumber) {
    const digits = config.whatsappNumber.replace(/\D/g, '')
    if (!digits) return null
    const q = message ? `?text=${encodeURIComponent(message)}` : ''
    return `https://wa.me/${digits}${q}`
  }
  return null
}

/** Mejor canal de contacto disponible: WhatsApp primero, mailto como fallback. */
export function buildContactUrl(config: PlatformConfigData, message?: string): string | null {
  return buildWhatsappUrl(config, message) ?? (config.contactEmail ? `mailto:${config.contactEmail}` : null)
}
