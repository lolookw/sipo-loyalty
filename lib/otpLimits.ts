// Límites de envío del código de acceso del cliente. Puro (sin DB) para poder testear los bordes.
//
// El OTP es la única puerta de entrada del cliente a su tarjeta, y el endpoint que lo manda es
// público por necesidad. El límite por email (5/hora) frena que alguien moleste a UNA persona,
// pero no frena a alguien que rocía miles de direcciones distintas: cada una tiene su propio
// contador. Eso quema la cuota de Resend —compartida por toda la plataforma, incluido este mismo
// login— y ensucia la reputación de envío del dominio.
//
// La guarda de abajo mide DISPERSIÓN, no volumen: cuántas direcciones distintas pidieron un código
// en la última hora. Un cliente real que pide el código tres veces cuenta como una; alguien
// rociando direcciones inventadas suma una por cada intento.
//
// Y solo se aplica a direcciones DESCONOCIDAS. Quien ya es cliente de alguna cafetería entra
// siempre, aunque el ataque esté en curso: lo único que se frena durante una ráfaga son las altas
// nuevas, que se recuperan solas cuando pasa la hora.

/** Envíos por hora para una misma dirección. Frena el hostigamiento a una persona puntual. */
export const OTP_PER_EMAIL_HOURLY = 5

/**
 * Direcciones DESCONOCIDAS distintas que pueden pedir código en una hora, en toda la plataforma.
 * Tiene que quedar bien por encima de las altas reales de una hora pico; subirlo a medida que
 * crezca la cantidad de cafeterías.
 */
export const OTP_UNKNOWN_EMAIL_HOURLY_CAP = 60

export type OtpSendDecision =
  | { ok: true }
  | { ok: false; reason: 'per_email' | 'unknown_flood' }

export function otpSendDecision(input: {
  /** El email ya pertenece a una persona registrada en la plataforma. */
  isKnownCustomer: boolean
  /** Códigos pedidos para ESTE email en la última hora. */
  sendsForThisEmailLastHour: number
  /**
   * Direcciones distintas que pidieron código en la última hora (toda la plataforma).
   * Solo se consulta cuando el email es desconocido — a un cliente existente no lo frena nunca.
   */
  distinctEmailsLastHour?: number
}): OtpSendDecision {
  if (input.sendsForThisEmailLastHour >= OTP_PER_EMAIL_HOURLY) return { ok: false, reason: 'per_email' }

  if (!input.isKnownCustomer && (input.distinctEmailsLastHour ?? 0) > OTP_UNKNOWN_EMAIL_HOURLY_CAP)
    return { ok: false, reason: 'unknown_flood' }

  return { ok: true }
}
