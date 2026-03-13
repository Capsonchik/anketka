import type { ReactNode } from 'react'

import { userPermissionLabel } from '@/entities/user'

import styles from './TeamUserModal.module.css'

export function Field ({
  label,
  value,
  isMonospace,
}: {
  label: string
  value: ReactNode
  isMonospace?: boolean
}) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>{label}</div>
      <div className={[styles.value, isMonospace ? styles.monospace : null].filter(Boolean).join(' ')}>
        {value}
      </div>
    </div>
  )
}

export function FieldEdit ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>{label}</div>
      {children}
    </div>
  )
}

export function PermissionTags ({ permissions }: { permissions: string[] }) {
  if (!permissions.length) {
    return <div className={styles.value}>—</div>
  }

  return (
    <div className={styles.tags}>
      {permissions.map((key) => (
        <span key={key} className={styles.tag} title={key}>
          {userPermissionLabel(key)}
        </span>
      ))}
    </div>
  )
}
