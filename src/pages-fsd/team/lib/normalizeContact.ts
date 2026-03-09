export function normalizeEmail (email: string): string {
  return String(email || '').trim().toLowerCase()
}

export function normalizePhone (phone: string | null | undefined): string | null {
  const raw = String(phone || '').trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  return digits || null
}

