export type AuditorGender = 'male' | 'female'

export type AuditorItem = {
  id: string
  publicId: number
  lastName: string
  firstName: string
  middleName: string | null
  phone: string | null
  email: string | null
  city: string
  birthDate: string | null
  gender: AuditorGender | null
  createdAt: string
}

export type AuditorsResponse = {
  items: AuditorItem[]
}

export type AuditorCreateRequest = {
  lastName: string
  firstName: string
  middleName?: string | null
  phone?: string | null
  email?: string | null
  city: string
  birthDate: string
  gender: AuditorGender
}

export type AuditorCreateResponse = {
  auditor: AuditorItem
}

export type AuditorImportErrorItem = {
  row: number
  message: string
}

export type AuditorImportResponse = {
  created: number
  skipped: number
  errors: AuditorImportErrorItem[]
}

