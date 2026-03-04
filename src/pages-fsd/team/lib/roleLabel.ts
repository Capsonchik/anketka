import type { Role } from '../model/types'

export function roleLabel (role: Role) {
  if (role === 'admin') return 'Админ'
  if (role === 'coordinator') return 'Координатор'
  return 'Менеджер'
}

