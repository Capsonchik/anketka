import Image from 'next/image'

import type { AuditorItem, AuditorGender } from '@/entities/auditor'

import styles from './TeamAuditorsTab.module.css'

export function TeamAuditorsTable ({
  items,
  isAdmin,
  onEdit,
  onDelete,
}: {
  items: AuditorItem[]
  isAdmin: boolean
  onEdit: (auditor: AuditorItem) => void
  onDelete: (auditorId: string) => void
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>ID</th>
            <th className={styles.th}>ФИО</th>
            <th className={styles.th}>Контакты</th>
            <th className={styles.th}>Город</th>
            <th className={styles.th}>Дата рождения</th>
            <th className={styles.th}>Пол</th>
            <th className={styles.th} />
          </tr>
        </thead>
        <tbody>
          {items.map((auditor) => (
            <tr key={auditor.id}>
              <td className={styles.td}>
                <span className={styles.mono} title={auditor.id}>{auditor.publicId}</span>
              </td>
              <td className={styles.td}>{formatName(auditor)}</td>
              <td className={styles.td}>
                <div className={styles.mono}>{auditor.phone ?? '—'}</div>
                <div className={styles.mono}>{auditor.email ?? '—'}</div>
              </td>
              <td className={styles.td}>{auditor.city}</td>
              <td className={styles.td}>
                <span className={styles.mono}>{auditor.birthDate ?? '—'}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.mono}>{genderLabel(auditor.gender)}</span>
              </td>
              <td className={styles.td}>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={!isAdmin}
                    onClick={() => onEdit(auditor)}
                    aria-label="Редактировать"
                    title="Редактировать"
                  >
                    <Image src="/icons/edit.svg" alt="" width={16} height={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                    disabled={!isAdmin}
                    onClick={() => onDelete(auditor.id)}
                    aria-label="Удалить"
                    title="Удалить"
                  >
                    <Image src="/icons/trash.svg" alt="" width={16} height={16} aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatName (a: AuditorItem): string {
  return [a.lastName, a.firstName, a.middleName].filter(Boolean).join(' ')
}

function genderLabel (gender: AuditorGender | null | undefined): string {
  if (gender === 'male') return 'м'
  if (gender === 'female') return 'ж'
  return '—'
}
