export const userRoles = ['admin', 'coordinator', 'manager', 'client', 'controller'] as const

export type UserRole = (typeof userRoles)[number]

export const userRoleLabels: Record<UserRole, string> = {
  admin: 'Админ',
  coordinator: 'Координатор',
  manager: 'Менеджер',
  client: 'Клиент',
  controller: 'Контроллер',
}

export function userRoleLabel (role: UserRole): string {
  return userRoleLabels[role]
}

export const userRoleOptions: Array<{ label: string; value: UserRole }> = userRoles.map((role) => ({
  label: userRoleLabel(role),
  value: role,
}))

