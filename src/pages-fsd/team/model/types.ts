import type { UserRole } from '@/entities/user'

export type TeamUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  company: TeamUserCompany
  role: UserRole
  note: string | null
  createdAt: string
}

export type TeamUserCompany = {
  id: string
  name: string
}

export type TeamUsersResponse = {
  items: TeamUser[]
}

export type CreateUserResponse = {
  user: TeamUser
  temporaryPassword: string
}

export type MeResponse = {
  role: UserRole
  company: TeamUserCompany
}

export type TeamUserDetailsResponse = {
  user: TeamUser
  password: string | null
}

export type TeamUsersImportError = {
  row: number
  message: string
}

export type TeamUsersImportResponse = {
  created: number
  skipped: number
  errors?: TeamUsersImportError[]
}

export type UserProjectAccessItem = {
  projectId: string
  accessRole: 'controller' | 'coordinator'
  regionCodes: string[]
}

export type UserProjectAccessResponse = {
  userId: string
  items: UserProjectAccessItem[]
}

export type UserProjectAccessReplaceRequest = {
  items: UserProjectAccessItem[]
}

export type BulkAssignRequest = {
  userIds: string[]
  projectId: string
  accessRole: 'controller' | 'coordinator'
  regionCodes: string[]
}

export type BulkAssignResponse = {
  updatedUsers: number
}

export type UserPointAccessResponse = {
  userId: string
  projectId: string | null
  pointIds: string[]
}

export type UserPointAccessReplaceRequest = {
  pointIds: string[]
}

