export type Role = 'admin' | 'coordinator' | 'manager'

export type TeamUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  company: TeamUserCompany
  role: Role
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
  role: Role
  company: TeamUserCompany
}

export type TeamUserDetailsResponse = {
  user: TeamUser
  password: string | null
}

