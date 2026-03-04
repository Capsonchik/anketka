function parseIsoDateOnly (value: string): Date | null {
  const v = String(value || '').trim()
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null

  const y = Number(m[1])
  const mm = Number(m[2])
  const d = Number(m[3])
  if (!y || !mm || !d) return null

  return new Date(y, mm - 1, d)
}

export function formatRuDate (isoDate: string) {
  const dt = parseIsoDateOnly(isoDate)
  if (!dt) return isoDate
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(dt)
}

