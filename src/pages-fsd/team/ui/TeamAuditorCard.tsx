import Image from 'next/image'

import type { AuditorItem, AuditorGender } from '@/entities/auditor'

import styles from './TeamAuditorsTab.module.css'

export function TeamAuditorCard ({
  auditor,
  isAdmin,
  onEdit,
  onDelete,
}: {
  auditor: AuditorItem
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardMain}>
        <div className={styles.cardName}>{formatName(auditor)}</div>
        <div className={styles.cardContacts}>
          <div className={styles.mono}>{auditor.phone ?? '—'}</div>
          <div className={styles.mono}>{auditor.email ?? '—'}</div>
        </div>
        <div className={styles.cardMeta}>
          <div>Город: {auditor.city || '—'}</div>
          <div>
            Дата рождения: <span className={styles.mono}>{auditor.birthDate ?? '—'}</span>
          </div>
          <div>
            Пол: <span className={styles.mono}>{genderLabel(auditor.gender)}</span>
          </div>
        </div>
      </div>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!isAdmin}
          onClick={onEdit}
          aria-label="Редактировать"
          title="Редактировать"
        >
          <Image src="/icons/edit.svg" alt="" width={16} height={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
          disabled={!isAdmin}
          onClick={onDelete}
          aria-label="Удалить"
          title="Удалить"
        >
          <Image src="/icons/trash.svg" alt="" width={16} height={16} aria-hidden="true" />
        </button>
      </div>
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
