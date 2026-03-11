'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, Modal, SelectPicker } from 'rsuite'
import Image from 'next/image'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { userRoleLabel } from '@/entities/user'
import { userRoleOptions, type UserRole } from '@/entities/user'
import type { TeamUserDetailsResponse, UserPointAccessResponse, UserProjectAccessResponse } from '../model/types'

import styles from './TeamUserDetailsModal.module.css'

export function TeamUserDetailsModal ({
  open,
  onClose,
  isLoading,
  error,
  details,
  isAdmin,
  canEdit,
  mode,
  onModeChange,
  onSave,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  isLoading: boolean
  error: string | null
  details: TeamUserDetailsResponse | null
  isAdmin: boolean
  canEdit: boolean
  mode: 'view' | 'edit'
  onModeChange: (mode: 'view' | 'edit') => void
  onSave: (userId: string, patch: { firstName: string; lastName: string; email: string; phone: string | null; role: UserRole; note: string | null }) => void | Promise<void>
  onDelete: (userId: string) => void | Promise<void>
}) {
  const user = details?.user
  const initials = user ? getInitials(user.firstName, user.lastName) : '—'
  const companyName = user?.company?.name || '—'
  const password = isAdmin ? details?.password : null
  const canRender = !!user && !isLoading && !error
  const actualMode: 'view' | 'edit' = mode === 'edit' && !canEdit ? 'view' : mode

  const initialForm = useMemo(() => {
    return {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      role: (user?.role ?? 'manager') as UserRole,
      note: user?.note ?? '',
    }
  }, [user])

  const [form, setForm] = useState(initialForm)
  const [access, setAccess] = useState<UserProjectAccessResponse | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [pointsAccess, setPointsAccess] = useState<UserPointAccessResponse | null>(null)
  const [pointsAccessError, setPointsAccessError] = useState<string | null>(null)

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  useEffect(() => {
    const uid = user?.id
    if (!open || !uid || !isAdmin) {
      setAccess(null)
      setAccessError(null)
      setPointsAccess(null)
      setPointsAccessError(null)
      return
    }
    let isAlive = true
    setAccess(null)
    setAccessError(null)
    setPointsAccess(null)
    setPointsAccessError(null)

    Promise.all([
      axiosMainRequest.get<UserProjectAccessResponse>(apiRoutes.team.userProjectAccess(uid)),
      axiosMainRequest.get<UserPointAccessResponse>(apiRoutes.team.userPointAccess(uid)),
    ])
      .then(([aRes, pRes]) => {
        if (!isAlive) return
        setAccess(aRes.data)
        setPointsAccess(pRes.data)
      })
      .catch((err: unknown) => {
        if (!isAlive) return
        const msg = err instanceof Error ? err.message : 'Не удалось загрузить привязки'
        setAccessError(msg)
        setPointsAccessError(msg)
      })
    return () => {
      isAlive = false
    }
  }, [isAdmin, open, user?.id])

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <Modal.Header>
        <Modal.Title>Участник</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {isLoading ? <div>Загрузка…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {canRender ? (
          <div className={styles.content}>
            <div className={styles.left}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
              <div className={styles.roleBadge}>{userRoleLabel(user.role)}</div>
            </div>

            <div className={styles.right}>
              {actualMode === 'view' ? (
                <div className={styles.grid}>
                  <div className={styles.fullName}>
                    {user.firstName} {user.lastName}
                  </div>
                  <Field label="Компания" value={companyName} />
                  <Field label="Почта" value={user.email} isMonospace />
                  <Field label="Телефон" value={user.phone || '—'} isMonospace />
                  <Field label="Заметка" value={user.note || '—'} />
                  {accessError ? <Field label="Доступы" value="ошибка" /> : null}
                  {!accessError ? (
                    <Field
                      label="Доступы"
                      value={
                        access?.items?.length
                          ? access.items
                            .map((x) => `${x.accessRole}: ${x.projectId}${x.regionCodes?.length ? ` · ${x.regionCodes.join(', ')}` : ''}`)
                            .join('; ')
                          : '—'
                      }
                    />
                  ) : null}
                  {pointsAccessError ? <Field label="Локации" value="ошибка" /> : null}
                  {!pointsAccessError ? (
                    <Field
                      label="Локации"
                      value={pointsAccess?.pointIds?.length ? `Точек: ${pointsAccess.pointIds.length}` : '—'}
                    />
                  ) : null}
                  {password ? <Field label="Временный пароль" value={password} isMonospace /> : null}
                </div>
              ) : (
                <div className={styles.grid}>
                  <FieldEdit label="Имя *">
                    <Input value={form.firstName} onChange={(v) => setForm((p) => ({ ...p, firstName: String(v ?? '') }))} />
                  </FieldEdit>
                  <FieldEdit label="Фамилия *">
                    <Input value={form.lastName} onChange={(v) => setForm((p) => ({ ...p, lastName: String(v ?? '') }))} />
                  </FieldEdit>
                  <FieldEdit label="Почта *">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(v) => setForm((p) => ({ ...p, email: String(v ?? '') }))}
                      placeholder="user@example.com"
                    />
                  </FieldEdit>
                  <FieldEdit label="Телефон">
                    <Input
                      value={form.phone}
                      onChange={(v) => setForm((p) => ({ ...p, phone: String(v ?? '') }))}
                      placeholder="+7…"
                      inputMode="tel"
                    />
                  </FieldEdit>
                  <FieldEdit label="Роль *">
                    <SelectPicker
                      value={form.role}
                      onChange={(v) => setForm((p) => ({ ...p, role: ((v as UserRole) ?? 'manager') }))}
                      cleanable={false}
                      searchable={false}
                      block
                      data={userRoleOptions}
                    />
                  </FieldEdit>
                  <FieldEdit label="Заметка">
                    <Input
                      as="textarea"
                      rows={3}
                      value={form.note}
                      onChange={(v) => setForm((p) => ({ ...p, note: String(v ?? '') }))}
                    />
                  </FieldEdit>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footerActions}>
          {actualMode === 'view' ? (
            <>
              <IconButton label="Закрыть" onClick={onClose} disabled={isLoading}>
                <XIcon />
              </IconButton>
              {user && canEdit ? (
                <IconButton label="Изменить" onClick={() => onModeChange('edit')} disabled={isLoading}>
                  <Image src="/icons/edit.svg" alt="" width={16} height={16} aria-hidden="true" />
                </IconButton>
              ) : null}
              {user && isAdmin ? (
                <IconButton
                  label="Удалить"
                  onClick={() => onDelete(user.id)}
                  disabled={isLoading}
                  variant="danger"
                >
                  <Image src="/icons/trash.svg" alt="" width={16} height={16} aria-hidden="true" />
                </IconButton>
              ) : null}
            </>
          ) : (
            <>
              <IconButton
                label="Отмена"
                onClick={() => {
                  onModeChange('view')
                  setForm(initialForm)
                }}
                disabled={isLoading}
              >
                <XIcon />
              </IconButton>
              {user ? (
                <IconButton
                  label="Сохранить"
                  onClick={() => {
                    const fn = form.firstName.trim()
                    const ln = form.lastName.trim()
                    const em = form.email.trim()
                    if (!fn || !ln || !em) return
                    onSave(user.id, {
                      firstName: fn,
                      lastName: ln,
                      email: em,
                      phone: form.phone.trim() || null,
                      role: form.role,
                      note: form.note.trim() || null,
                    })
                  }}
                  disabled={isLoading}
                  variant="primary"
                >
                  <CheckIcon />
                </IconButton>
              ) : null}
            </>
          )}
        </div>
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

function FieldEdit ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>{label}</div>
      {children}
    </div>
  )
}

function IconButton ({
  label,
  onClick,
  disabled,
  variant,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'danger' | 'primary'
  children: React.ReactNode
}) {
  const variantClass =
    variant === 'danger'
      ? styles.iconButtonDanger
      : variant === 'primary'
        ? styles.iconButtonPrimary
        : ''

  return (
    <button
      type="button"
      className={[styles.iconButton, variantClass].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function XIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

