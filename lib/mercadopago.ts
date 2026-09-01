// Wrapper fino sobre el SDK oficial de Mercado Pago (`mercadopago` npm). Todo lo que toca la red
// vive acá; lib/subscriptionWebhook.ts tiene la lógica pura de qué hacer con lo que llega.
// Ver sipo-plan/04-mercado-pago/plan.md.

import { MercadoPagoConfig, PreApproval, Payment, Invoice } from 'mercadopago'
import { WebhookSignatureValidator, InvalidWebhookSignatureError, MPNotFoundError } from 'mercadopago'

function getClient(): MercadoPagoConfig | null {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return null
  return new MercadoPagoConfig({ accessToken })
}

export interface CreateSubscriptionOpts {
  cafeId: string
  cafeName: string
  tierLabel: string
  amount: number
  payerEmail: string
  backUrl: string
  /** Fecha del PRIMER cobro. Se usa cuando el café ya tiene un período pago corriendo: sin esto
   *  se le cobraría de nuevo un mes que ya está pagado. Si no viene, MP cobra al autorizar. */
  startDate?: Date
}

export interface CreateSubscriptionResult {
  preapprovalId: string
  status: string | null
  initPoint: string
}

/**
 * Crea una suscripción (preapproval) SIN card_token_id — MP devuelve `init_point` para
 * redirigir al dueño a autorizar con su tarjeta ahí. `external_reference` = cafe.id, clave
 * para matchear el webhook al café correcto (ver plan §5A).
 */
export async function createSubscriptionPreapproval(opts: CreateSubscriptionOpts): Promise<CreateSubscriptionResult | null> {
  const client = getClient()
  if (!client) return null
  const preApproval = new PreApproval(client)
  const res = await preApproval.create({
    body: {
      reason: `Sipo · Plan ${opts.tierLabel} — ${opts.cafeName}`,
      external_reference: opts.cafeId,
      payer_email: opts.payerEmail,
      back_url: opts.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: opts.amount,
        currency_id: 'ARS',
        ...(opts.startDate ? { start_date: opts.startDate.toISOString() } : {}),
      },
    },
  })
  if (!res.id || !res.init_point) return null
  return { preapprovalId: res.id, status: res.status ?? null, initPoint: res.init_point }
}

// Un cobro de suscripción puede llegar por DOS topics distintos de webhook (Mercado Pago
// recomienda tildar ambos para integraciones de Suscripciones — confirmado en su propio panel):
// "payment" (recurso clásico /v1/payments) y "subscription_authorized_payment" (recurso Invoice,
// específico de Preapproval, con su propio ciclo scheduled→processed/recycling). Se normalizan acá
// a la misma forma para que el resto del código no necesite saber cuál de los dos llegó.
export interface MpChargeInfo {
  paymentId: string
  status: string | null
  externalReference: string | null
  preapprovalId: string | null
}

/** Trae el estado REAL de un pago desde la API de MP — nunca confiar en el payload del webhook. */
export async function getMpPayment(paymentId: string): Promise<MpChargeInfo | null> {
  const client = getClient()
  if (!client) return null
  const payment = new Payment(client)
  const res = await payment.get({ id: paymentId })
  if (!res.id) return null
  return { paymentId: String(res.id), status: res.status ?? null, externalReference: res.external_reference ?? null, preapprovalId: null }
}

/**
 * Trae un Invoice (cobro de suscripción, "authorized_payment") por id. El estado relevante para
 * decidir si el cobro salió bien es el del PAGO embebido (`invoice.payment`), no `invoice.status`
 * (que usa vocabulario distinto: scheduled/processed/recycling, sobre el ciclo de reintentos).
 */
export async function getMpInvoice(invoiceId: string): Promise<MpChargeInfo | null> {
  const client = getClient()
  if (!client) return null
  const invoice = new Invoice(client)
  const res = await invoice.get({ id: invoiceId })
  if (!res.id) return null
  const payment = res.payment
  return {
    paymentId: payment?.id ? String(payment.id) : String(res.id),
    status: payment?.status ?? null,
    externalReference: res.external_reference ?? null,
    preapprovalId: res.preapproval_id ?? null,
  }
}

/**
 * Cancela una suscripción en MP (corta el cobro automático a futuro). Devuelve true si quedó
 * cancelada. NO toca `activeUntil` — el café sigue con su tope pago hasta la fecha ya pagada
 * (ver plan §5E); eso lo decide quien llama.
 *
 * Idempotente del lado de MP: cancelar una suscripción ya cancelada no rompe. Si el preapproval
 * ya no existe (borrado, id viejo), se trata como éxito — el objetivo (que no cobre más) se cumple.
 */
export async function cancelSubscription(preapprovalId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = getClient()
  if (!client) return { ok: false, reason: 'Mercado Pago no está configurado' }
  const preApproval = new PreApproval(client)

  // Se mira el estado ANTES de intentar cancelar. Dos casos en los que no hay nada que hacer y
  // que antes devolvían error, dejando trabado el borrado del café con un 502:
  //  • La suscripción ya está cancelada — MP rechaza que la canceles de nuevo.
  //  • El id no existe en esta cuenta (un id viejo de otra cuenta o ya borrado).
  // En los dos el objetivo ya está cumplido: no va a cobrar más.
  const actual = await getPreapproval(preapprovalId)
  if (actual === null) {
    console.warn(`MP cancelSubscription: ${preapprovalId} no existe en esta cuenta — se da por cancelada.`)
    return { ok: true }
  }
  if (actual.status === 'cancelled') return { ok: true }

  try {
    await preApproval.update({ id: preapprovalId, body: { status: 'cancelled' } })
    return { ok: true }
  } catch (e) {
    console.error('MP cancelSubscription error:', preapprovalId, e)
    const reason = e instanceof Error ? e.message : String(e)
    return { ok: false, reason }
  }
}

/**
 * Cambia el monto que MP cobra en cada ciclo de una suscripción ya autorizada (ver plan §5G).
 *
 * ⚠️ La documentación de MP NO aclara si este PUT dispara un cobro inmediato por la diferencia o
 * si recién aplica en el próximo ciclo (buscado a fondo: la referencia de la API solo describe
 * los campos; el "monto proporcional" que sí documentan es para alinear el PRIMER mes con un
 * `billing_day`, no para cambios a mitad de ciclo). Como no se puede confirmar desde la doc, acá
 * se verifica empíricamente: se relee la suscripción después del PUT y se loguea
 * `next_payment_date`. Si esa fecha quedara en el pasado/hoy, es señal de un cobro adelantado y
 * queda registrado en los logs para poder reaccionar.
 */
export async function updateSubscriptionAmount(preapprovalId: string, amount: number): Promise<boolean> {
  const client = getClient()
  if (!client) return false
  const preApproval = new PreApproval(client)
  try {
    await preApproval.update({
      id: preapprovalId,
      body: { auto_recurring: { transaction_amount: amount, currency_id: 'ARS' } },
    })
    // Verificación post-cambio: confirmar que el monto quedó y ver cuándo cae el próximo cobro.
    const after = await preApproval.get({ id: preapprovalId })
    const next = after.next_payment_date ? new Date(after.next_payment_date) : null
    if (next && next.getTime() <= Date.now()) {
      console.error(
        `[MP] ATENCIÓN: tras cambiar el monto de ${preapprovalId} a ${amount}, next_payment_date ` +
        `quedó en ${after.next_payment_date} (hoy o antes) — posible cobro inmediato por la diferencia.`,
      )
    } else {
      console.log(`[MP] Monto de ${preapprovalId} actualizado a ${amount}; próximo cobro: ${after.next_payment_date ?? 'desconocido'}`)
    }
    return true
  } catch (e) {
    console.error('MP updateSubscriptionAmount error:', preapprovalId, e)
    return false
  }
}

export interface MpPreapprovalInfo {
  status: string | null
}

/** Refresca el status del preapproval en sí (solo diagnóstico — la lógica real vive en activeUntil). */
export async function getPreapproval(preapprovalId: string): Promise<MpPreapprovalInfo | null> {
  const client = getClient()
  if (!client) return null
  const preApproval = new PreApproval(client)
  try {
    const res = await preApproval.get({ id: preapprovalId })
    if (!res.id) return null
    return { status: res.status ?? null }
  } catch (e) {
    // Un id guardado de otra cuenta (p. ej. de cuando se probaba con credenciales de prueba) no
    // existe acá: se trata como "no hay suscripción" en vez de romper el endpoint que llama.
    if (e instanceof MPNotFoundError || (e as { status?: number })?.status === 404) return null
    throw e
  }
}

/**
 * Busca el Invoice (cobro) más reciente de una suscripción. Usado por el botón "Chequear el
 * cobro" en superadmin — mismo dato que traería el webhook, pero pedido a demanda para el caso en
 * que el webhook se haya perdido o demorado (ver plan §5D).
 */
export async function getLatestInvoice(preapprovalId: string): Promise<MpChargeInfo | null> {
  const client = getClient()
  if (!client) return null
  const invoice = new Invoice(client)
  const res = await invoice.search({ options: { preapproval_id: preapprovalId, limit: 10 } })
    .catch(e => {
      // Id de otra cuenta (p. ej. de las pruebas): no hay cobros que mirar, no es un error.
      if (e instanceof MPNotFoundError || (e as { status?: number })?.status === 404) return null
      throw e
    })
  const results = res?.results ?? []
  if (results.length === 0) return null
  const latest = results.reduce((a, b) => ((a.date_created ?? '') > (b.date_created ?? '') ? a : b))
  const payment = latest.payment
  if (!latest.id) return null
  return {
    paymentId: payment?.id ? String(payment.id) : String(latest.id),
    status: payment?.status ?? null,
    externalReference: latest.external_reference ?? null,
    preapprovalId: latest.preapproval_id ?? null,
  }
}

export interface MpWebhookRequestLike {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}

/**
 * Valida la firma del webhook usando el validador oficial del SDK (HMAC-SHA256, constant-time,
 * maneja el parseo de `ts=...,v1=...`). Devuelve false en vez de tirar, para que el route handler
 * solo tenga que chequear un booleano. Loguea la razón del rechazo para debug.
 */
export function isValidMpWebhookSignature(req: MpWebhookRequestLike, secret: string): boolean {
  try {
    WebhookSignatureValidator.validate({
      xSignature: req.xSignature,
      xRequestId: req.xRequestId,
      dataId: req.dataId,
      secret,
    })
    return true
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) {
      console.error('MP webhook signature inválida:', e.reason, 'requestId:', e.requestId)
    } else {
      console.error('MP webhook signature error inesperado:', e)
    }
    return false
  }
}
