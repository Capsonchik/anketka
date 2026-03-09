export type ProjectItem = {
  id: string
  name: string
  comment: string | null
  startDate: string
  endDate: string
  manager: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  createdAt: string
}

export type ProjectsResponse = {
  items: ProjectItem[]
}

export type CreateProjectRequest = {
  name: string
  comment: string | null
  startDate: string
  endDate: string
  managerId: string
}

export type CreateProjectResponse = {
  project: ProjectItem
}

export type TeamUserItem = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export type TeamUsersResponse = {
  items: TeamUserItem[]
}

import type { UserRole } from '@/entities/user'

export type MeResponse = {
  id: string
  role: UserRole
}

