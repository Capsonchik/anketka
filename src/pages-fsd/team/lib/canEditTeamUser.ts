import type { UserRole } from '@/entities/user'

export function canEditTeamUser (actorRole: UserRole | null, targetRole: UserRole): boolean {
  if (!actorRole) return false
  if (actorRole === 'admin') return true

  if (actorRole === 'manager') {
    return targetRole !== 'admin'
  }

  return false
}

