'use client'

import { Button, Modal } from 'rsuite'

import { userRoleLabel } from '@/entities/user'
import type { TeamUserDetailsResponse } from '../model/types'

import styles from './TeamUserDetailsModal.module.css'

export function TeamUserDetailsModal ({
  open,
  onClose,
  isLoading,
  error,
  details,
  isAdmin,
}: {
  open: boolean
  onClose: () => void
  isLoading: boolean
  error: string | null
  details: TeamUserDetailsResponse | null
  isAdmin: boolean
}) {
  const user = details?.user
  const initials = user ? getInitials(user.firstName, user.lastName) : '—'
  const companyName = user?.company?.name || '—'
  const password = isAdmin ? details?.password : null

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <Modal.Header>
        <Modal.Title>Участник</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {isLoading ? <div>Загрузка…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {user && !isLoading && !error ? (
          <div className={styles.content}>
            <div className={styles.left}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
              <div className={styles.roleBadge}>{userRoleLabel(user.role)}</div>
            </div>

            <div className={styles.right}>
              <div className={styles.grid}>
                <div className={styles.fullName}>
                  {user.firstName} {user.lastName}
                </div>
                <Field label="Компания" value={companyName} />
                <Field label="Почта" value={user.email} isMonospace />
                <Field label="Заметка" value={user.note || '—'} />
                {password ? <Field label="Временный пароль" value={password} isMonospace /> : null}
              </div>
            </div>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button appearance="subtle" onClick={onClose}>
          Закрыть
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function Field ({
  label,
  value,
  isMonospace,
}: {
  label: string
  value: string
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

function getInitials (firstName: string, lastName: string) {
  const f = String(firstName || '').trim()
  const l = String(lastName || '').trim()
  const fi = f ? f[0] : ''
  const li = l ? l[0] : ''
  const res = (fi + li).toUpperCase()
  return res || '—'
}

