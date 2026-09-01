// Aritmética de meses para las fechas de plan. Puro (sin DB) para poder testear los bordes.
//
// El problema que resuelve: `date.setMonth(date.getMonth() + 1)` sobre un 31 de enero pide un
// "31 de febrero", que no existe, y JavaScript lo desborda al 3 de marzo — un mes de 31 días que
// se come el mes entero de febrero. Pasa con cualquier fecha del 29 al 31 que caiga en un mes más
// corto: 31/03 → 01/05, 31/08 → 01/10, etc.
//
// Además, una vez desbordada la fecha queda pegada al día 1-3 para siempre (el día 3 nunca vuelve
// a desbordar), así que un café que se suscribió un 31 termina venciendo los 3 de cada mes.

/** Cantidad de días del mes (mes 0-indexado, como en Date). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Suma meses recortando al último día del mes destino en vez de desbordar.
 *
 * `anchorDay` es el día de facturación del café: el día del mes en el que arrancó su período pago.
 * Sin él, la fecha se recorta contra el día de `from`, lo que evita el desborde pero pierde el día
 * original para siempre (31/01 → 28/02 → 28/03). Con él, el día se recupera en cuanto el mes lo
 * permite, que es como factura cualquier sistema de suscripciones:
 *
 *   anclado en 31:  31/01 → 28/02 → 31/03 → 30/04 → 31/05
 *   sin ancla:      31/01 → 28/02 → 28/03 → 28/04 → 28/05
 *
 * La hora del día se conserva.
 */
export function addMonths(from: Date, months: number, anchorDay?: number | null): Date {
  const day =
    typeof anchorDay === 'number' && Number.isInteger(anchorDay) && anchorDay >= 1 && anchorDay <= 31
      ? anchorDay
      : from.getDate()

  const target = new Date(from)
  // Pararse en el día 1 antes de mover el mes: si no, el propio setMonth ya desborda.
  target.setDate(1)
  target.setMonth(target.getMonth() + months)
  target.setDate(Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())))
  return target
}

/**
 * Día de facturación a guardar a partir de la fecha en la que arranca un período pago.
 * Se guarda el día real (28, 29, 30, 31), no el recortado — es lo que permite recuperarlo
 * en los meses que sí lo tienen.
 */
export function billingAnchorFrom(date: Date): number {
  return date.getDate()
}
