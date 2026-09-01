// Ajuste manual de sellos/puntos de un cliente por parte del dueño, y borrado de un cliente de
// su café. Lógica PURA (sin prisma) para poder testear los bordes sin DB.

export interface CustomerAdjustInput {
  stamps?: unknown
  points?: unknown
}

export interface CustomerAdjustResult {
  stamps?: number
  points?: number
}

/**
 * Normaliza y valida un ajuste manual. Devuelve solo los campos realmente enviados (permite
 * tocar sellos sin pisar puntos y viceversa), o `null` si no vino nada válido.
 *
 * - Sellos: entero, topeado entre 0 y `stampsRequired` (una tarjeta no puede tener más sellos
 *   que los que necesita; ese es el estado "completa, lista para canjear").
 * - Puntos: número >= 0, redondeado a 2 decimales (el resto del sistema los trata como float).
 */
export function normalizeCustomerAdjust(input: CustomerAdjustInput, stampsRequired: number): CustomerAdjustResult | null {
  const result: CustomerAdjustResult = {}

  if (input.stamps !== undefined && input.stamps !== null) {
    const n = Number(input.stamps)
    if (!Number.isFinite(n)) return null
    result.stamps = Math.max(0, Math.min(Math.floor(n), Math.max(0, stampsRequired)))
  }

  if (input.points !== undefined && input.points !== null) {
    const n = Number(input.points)
    if (!Number.isFinite(n)) return null
    result.points = Math.max(0, Math.round(n * 100) / 100)
  }

  return Object.keys(result).length > 0 ? result : null
}

/**
 * Efectos secundarios sobre el tracking de reactivación al ajustar sellos a mano. Sin esto, un
 * ajuste podría dejar al cliente marcado como "tarjeta completa" cuando ya no lo está (y al revés),
 * disparando emails de reactivación equivocados (ver lib/reengagement.ts).
 */
export function reengagementFieldsForAdjust(stamps: number, stampsRequired: number, now: Date) {
  const isComplete = stampsRequired > 0 && stamps >= stampsRequired
  return {
    // Se completó recién con el ajuste → arranca la cuenta; dejó de estar completa → se limpia.
    cardCompletedAt: isComplete ? now : null,
    // El flag de "ya avisé por tarjeta completa" se resetea en ambos sentidos: si vuelve a
    // completarse más adelante, corresponde poder avisar de nuevo.
    reengagementCompletedSentAt: null,
  }
}
