import type { TeamUser } from '../model/types'
import { userRoleLabel } from '@/entities/user'

import styles from './TeamUserCard.module.css'

export function TeamUserCard ({
  user,
  onClick,
}: {
  user: TeamUser
  onClick: () => void
}) {
  const initials = getInitials(user.firstName, user.lastName)

  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={`Открыть пользователя ${user.firstName} ${user.lastName}`}
    >
      <div className={styles.avatar} aria-hidden="true">
        {initials}
      </div>
      <div className={styles.text}>
        <div className={styles.nameRow}>
          <div className={styles.firstName}>{user.firstName}</div>
          <div className={styles.lastName}>{user.lastName}</div>
        </div>
        <div className={styles.email}>{user.email}</div>
        <div className={styles.role}>{userRoleLabel(user.role)}</div>
      </div>
    </button>
  )
}

function getInitials (firstName: string, lastName: string) {
  const f = String(firstName || '').trim()
  const l = String(lastName || '').trim()
  const fi = f ? f[0] : ''
  const li = l ? l[0] : ''
  const res = (fi + li).toUpperCase()
  return res || '—'
}

