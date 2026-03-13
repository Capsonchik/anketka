import type { UserRole } from './roles'
import { userDefaultPermissionsByRole } from './permissions'

export type AccessUser = {
  role?: UserRole | null
  platformRole?: string | null
  permissions?: string[] | null
}

export function hasUserPermission (user: AccessUser | null | undefined, permissionKey: string): boolean {
  if (!user || !permissionKey) return false
  if ((user.platformRole || 'user') === 'owner') return true

  const permissions = new Set(user.permissions || [])
  const hasPagePermissionInProfile = Array.from(permissions).some((key) => key.startsWith('page.'))
  if (!hasPagePermissionInProfile && user.role) {
    for (const key of userDefaultPermissionsByRole[user.role] || []) {
      if (key.startsWith('page.')) permissions.add(key)
    }
  }

  return permissions.has(permissionKey)
}

