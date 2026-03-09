import type { UserRole } from '@/entities/user'

export function canEditTeamUser (actorRole: UserRole | null, targetRole: UserRole): boolean {
  if (!actorRole) return false
  if (actorRole === 'admin') return true

  if (actorRole === 'manager') {
    return targetRole === 'manager' || targetRole === 'controller' || targetRole === 'coordinator' || targetRole === 'auditor'
  }

  if (actorRole === 'controller') {
    return targetRole === 'controller' || targetRole === 'coordinator' || targetRole === 'auditor'
  }

  if (actorRole === 'coordinator') {
    return targetRole === 'auditor'
  }

  if (actorRole === 'auditor') {
    return targetRole === 'auditor'
  }

  return false
}

