import Image from 'next/image'

import { userRoleLabel } from '@/entities/user'
import type { TeamUser } from '../model/types'

import styles from './TeamUsersTable.module.css'

export function TeamUsersTable ({
  users,
  onOpen,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  users: TeamUser[]
  onOpen: (userId: string) => void
  onEdit: (userId: string) => void
  onDelete: (userId: string) => void
  canEdit: (user: TeamUser) => boolean
  canDelete: boolean
}) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Участник</th>
            <th>Телефон</th>
            <th>Почта</th>
            <th>Роль</th>
            <th className={styles.actionsCol} />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={styles.row} onClick={() => onOpen(u.id)}>
              <td className={styles.nameCell}>
                <div className={styles.name}>
                  <span className={styles.firstName}>{u.firstName}</span>
                  <span className={styles.lastName}>{u.lastName}</span>
                </div>
              </td>
              <td className={styles.phone}>{u.phone || '—'}</td>
              <td className={styles.email}>{u.email}</td>
              <td className={styles.role}>{userRoleLabel(u.role)}</td>
              <td className={styles.actions}>
                {canEdit(u) ? (
                  <IconButton
                    label="Изменить"
                    iconSrc="/icons/edit.svg"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(u.id)
                    }}
                  />
                ) : null}
                {canDelete ? (
                  <IconButton
                    label="Удалить"
                    iconSrc="/icons/trash.svg"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(u.id)
                    }}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IconButton ({
  iconSrc,
  label,
  onClick,
}: {
  iconSrc: string
  label: string
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button type="button" className={styles.iconButton} aria-label={label} onClick={onClick}>
      <Image src={iconSrc} alt="" width={16} height={16} aria-hidden="true" />
    </button>
  )
}

