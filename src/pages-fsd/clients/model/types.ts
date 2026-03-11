export type ClientItem = {
  id: string
  name: string
  category: string | null
  logoUrl: string | null
  backgroundUrl: string | null
  theme: Record<string, unknown>
  filters: unknown[]
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

export type UpdateClientRequest = Partial<CreateClientRequest>

export type ClientApUploadResponse = {
  clientId: string
  projectId: string
  created: number
  updated: number
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

