import Image from 'next/image'

import { userRoleLabel } from '@/entities/user'
import type { TeamUser } from '../model/types'

import styles from './TeamUserCard.module.css'

export function TeamUserCard ({
  user,
  onOpen,
  onEdit,
  onAccess,
  onLocations,
  onDelete,
  canEdit,
  canAccess,
  canLocations,
  canDelete,
}: {
  user: TeamUser
  onOpen: () => void
  onEdit: () => void
  onAccess: () => void
  onLocations: () => void
  onDelete: () => void
  canEdit: boolean
  canAccess: boolean
  canLocations: boolean
  canDelete: boolean
}) {
  const initials = getInitials(user.firstName, user.lastName)

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.card}
        onClick={onOpen}
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

      <div className={styles.actions}>
        {canEdit ? (
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Изменить"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Image src="/icons/edit.svg" alt="" width={16} height={16} aria-hidden="true" />
          </button>
        ) : null}
        {canAccess ? (
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Доступы"
            onClick={(e) => {
              e.stopPropagation()
              onAccess()
            }}
          >
            <Image src="/icons/pin.svg" alt="" width={16} height={16} aria-hidden="true" />
          </button>
        ) : null}
        {canLocations ? (
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Локации"
            onClick={(e) => {
              e.stopPropagation()
              onLocations()
            }}
          >
            <Image src="/icons/checklist.svg" alt="" width={16} height={16} aria-hidden="true" />
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Удалить"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Image src="/icons/trash.svg" alt="" width={16} height={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
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

