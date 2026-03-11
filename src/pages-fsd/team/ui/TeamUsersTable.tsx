import Image from 'next/image'

import { userRoleLabel } from '@/entities/user'
import type { TeamUser } from '../model/types'

import styles from './TeamUsersTable.module.css'

function fmtDt (value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
}

export function TeamUsersTable ({
  users,
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
  users: TeamUser[]
  onOpen: (userId: string) => void
  onEdit: (userId: string) => void
  onAccess: (userId: string) => void
  onLocations: (userId: string) => void
  onDelete: (userId: string) => void
  canEdit: (user: TeamUser) => boolean
  canAccess: boolean
  canLocations: boolean
  canDelete: boolean
}) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Роль</th>
            <th>Почта</th>
            <th>ФИО</th>
            <th>Телефон</th>
            <th>Компания</th>
            <th>Язык</th>
            <th>Заметка</th>
            <th>Активен</th>
            <th>Создан</th>
            <th>Последний вход</th>
            <th className={styles.actionsCol} />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={styles.row} onClick={() => onOpen(u.id)}>
              <td className={styles.email}>{u.id}</td>
              <td className={styles.role}>{userRoleLabel(u.role)}</td>
              <td className={styles.email}>{u.email}</td>
              <td className={styles.nameCell}>
                <div className={styles.name}>
                  <span className={styles.firstName}>{u.firstName}</span>
                  <span className={styles.lastName}>{u.lastName}</span>
                </div>
              </td>
              <td className={styles.phone}>{u.phone || '—'}</td>
              <td className={styles.email}>{u.profileCompany || '—'}</td>
              <td className={styles.role}>{u.uiLanguage || 'ru'}</td>
              <td className={styles.email}>{u.note || '—'}</td>
              <td className={styles.role}>{u.isActive ? 'Да' : 'Нет'}</td>
              <td className={styles.role}>{fmtDt(u.createdAt)}</td>
              <td className={styles.role}>{fmtDt(u.lastLoginAt)}</td>
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
                {canAccess ? (
                  <IconButton
                    label="Доступы"
                    iconSrc="/icons/pin.svg"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAccess(u.id)
                    }}
                  />
                ) : null}
                {canLocations ? (
                  <IconButton
                    label="Локации"
                    iconSrc="/icons/checklist.svg"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLocations(u.id)
                    }}
                  />
                ) : null}
                {canDelete ? (
                  <IconButton
                    label={u.isActive ? 'Деактивировать' : 'Активировать'}
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

