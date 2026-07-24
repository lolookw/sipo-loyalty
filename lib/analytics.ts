// Helpers PUROS de bucketing para la analítica (sin prisma) — testeables.

const DAY = 24 * 60 * 60 * 1000

/** Agrupa fechas en 8 buckets semanales (índice 0 = hace 8 semanas, 7 = semana actual). */
export function bucketWeekly(dates: Date[], now: Date): { label: string; count: number }[] {
  const buckets = Array.from({ length: 8 }, () => 0)
  for (const d of dates) {
    const idx = 7 - Math.floor((now.getTime() - d.getTime()) / (7 * DAY))
    if (idx >= 0 && idx < 8) buckets[idx]++
  }
  return buckets.map((count, i) => {
    const start = new Date(now.getTime() - (7 - i) * 7 * DAY)
    return { label: `${start.getDate()}/${start.getMonth() + 1}`, count }
  })
}

/** Agrupa fechas por hora local (0-23) aplicando un offset horario fijo (AR = 3). */
export function bucketHourly(dates: Date[], offsetH: number): { hour: number; count: number }[] {
  const buckets = Array.from({ length: 24 }, () => 0)
  for (const d of dates) {
    const h = (d.getUTCHours() - offsetH + 24) % 24
    buckets[h]++
  }
  return buckets.map((count, hour) => ({ hour, count }))
}

/** Cuenta clientes recurrentes (>=2 transacciones) a partir de los conteos por cliente. */
export function countRecurring(perCustomerCounts: number[]): number {
  return perCustomerCounts.filter(n => n >= 2).length
}
