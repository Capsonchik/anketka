export type ClientItem = {
  id: string
  name: string
  category: string | null
  logoUrl: string | null
  backgroundUrl: string | null
  theme: Record<string, unknown>
  filters: unknown[]
  isArchived: boolean
  baseApProjectId: string | null
  createdAt: string
}

export type ClientsResponse = {
  items: ClientItem[]
}

export type CreateClientRequest = {
  category: string | null
  name: string
  theme: Record<string, unknown>
  filters: unknown[]
}

export type UpdateClientRequest = Partial<CreateClientRequest> & { isArchived?: boolean }

export type ClientApUploadResponse = {
  clientId: string
  projectId: string
  created: number
  updated: number
}

export type ClientApPreviewRow = {
  name: string | null
  code: string | null
  address: string | null
  city: string | null
  region: string | null
  reg: string | null
  latitude: string | null
  longitude: string | null
}

export type ClientApPreviewResponse = {
  headers: string[]
  totalRows: number
  rows: ClientApPreviewRow[]
}

export type ClientUsersImportError = {
  row: number
  message: string
}

export type ClientUsersImportResponse = {
  created: number
  updated: number
  skipped: number
  errors?: ClientUsersImportError[] | null
}

export type ClientUsersImportPreviewRow = {
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string | null
  phone: string | null
  note: string | null
  password: string | null
}

export type ClientUsersImportPreviewResponse = {
  headers: string[]
  totalRows: number
  rows: ClientUsersImportPreviewRow[]
}

export type ClientOwnerItem = {
  userId: string
  email: string
  createdAt: string
}

export type ClientOwnersResponse = {
  clientId: string
  items: ClientOwnerItem[]
}

export type GrantClientOwnerRequest = {
  email: string
}

