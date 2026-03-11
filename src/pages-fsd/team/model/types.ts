import type { UserRole } from '@/entities/user'

export type TeamUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  company: TeamUserCompany
  role: UserRole
  profileCompany?: string | null
  uiLanguage: string
  isActive: boolean
  permissions: string[]
  note: string | null
  createdAt: string
  lastLoginAt?: string | null
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
  updated: number
  skipped: number
  errors?: TeamUsersImportError[]
}

export type UserGroupItem = {
  id: string
  name: string
  membersCount: number
  createdAt: string
}

export type UserGroupsResponse = {
  items: UserGroupItem[]
}

export type CreateUserGroupRequest = {
  name: string
}

export type UpdateUserGroupRequest = {
  name: string
}

export type UserGroupMembersResponse = {
  groupId: string
  userIds: string[]
}

export type ReplaceUserGroupMembersRequest = {
  userIds: string[]
}

export type UserGroupMembersImportError = {
  row: number
  message: string
}

export type UserGroupMembersImportResponse = {
  added: number
  skipped: number
  errors?: UserGroupMembersImportError[] | null
}

export type AddUserGroupMemberByEmailRequest = {
  email: string
}

export type UserGroupsForUserResponse = {
  userId: string
  groupIds: string[]
}

export type ReplaceUserGroupsForUserRequest = {
  groupIds: string[]
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

