'use client'

import { useEffect, useMemo, useState } from 'react'
import { Checkbox, Input, Modal, Nav, SelectPicker } from 'rsuite'
import Image from 'next/image'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { userRoleLabel } from '@/entities/user'
import { userRoleOptions, type UserRole } from '@/entities/user'
import { Button } from '@/shared/ui'
import type { TeamUserDetailsResponse, UserPointAccessResponse, UserProjectAccessResponse } from '../model/types'

import styles from './TeamUserDetailsModal.module.css'

function fmtDt (value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
}

const PERMISSIONS: Array<{ key: string; label: string }> = [
  { key: 'media.audio.view', label: 'Видеть аудио' },
  { key: 'media.photo.view', label: 'Видеть фото' },
  { key: 'media.video.view', label: 'Видеть видео' },
  { key: 'checks.create', label: 'Создавать проверки' },
  { key: 'checks.appeal', label: 'Апеллировать' },
  { key: 'notifications.enabled', label: 'Получать уведомления' },
  { key: 'checks.edit', label: 'Редактировать проверки' },
  { key: 'users.edit', label: 'Редактировать профили пользователей' },
  { key: 'notifications.send', label: 'Отправлять уведомления' },
  { key: 'notifications.inbox', label: 'Видеть уведомления' },
  { key: 'data.export', label: 'Экспорт' },
  { key: 'data.import', label: 'Импорт' },
  { key: 'tp.fio.view', label: 'Видеть ФИО ТП' },
  { key: 'survey.pdf.view', label: 'Видеть PDF анкеты' },
  { key: 'checks.price.view', label: 'Видеть цену проверки' },
]

const DEFAULTS: Record<UserRole, string[]> = {
  admin: PERMISSIONS.map((x) => x.key),
  manager: PERMISSIONS.map((x) => x.key),
  controller: [
    'media.audio.view',
    'media.photo.view',
    'media.video.view',
    'checks.appeal',
    'notifications.enabled',
    'notifications.inbox',
    'checks.edit',
    'data.export',
    'survey.pdf.view',
    'checks.price.view',
  ],
  coordinator: [
    'media.audio.view',
    'media.photo.view',
    'media.video.view',
    'checks.appeal',
    'notifications.enabled',
    'notifications.inbox',
    'checks.edit',
    'data.export',
    'survey.pdf.view',
    'checks.price.view',
  ],
  client: ['media.photo.view', 'survey.pdf.view', 'notifications.inbox'],
}

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
  onSave: (
    userId: string,
    patch: {
      firstName: string
      lastName: string
      email: string
      phone: string | null
      role: UserRole
      profileCompany: string | null
      uiLanguage: string
      isActive: boolean
      permissions: string[]
      note: string | null
      password: string | null
    },
  ) => void | Promise<void>
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
      profileCompany: user?.profileCompany ?? '',
      uiLanguage: user?.uiLanguage ?? 'ru',
      isActive: Boolean(user?.isActive ?? true),
      permissions: (user?.permissions ?? DEFAULTS[(user?.role ?? 'manager') as UserRole] ?? []).slice(),
      note: user?.note ?? '',
      password: '',
    }
  }, [user])

  const [form, setForm] = useState(initialForm)
  const [tab, setTab] = useState<'profile' | 'role' | 'distribution' | 'reports'>('profile')
  const [access, setAccess] = useState<UserProjectAccessResponse | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [pointsAccess, setPointsAccess] = useState<UserPointAccessResponse | null>(null)
  const [pointsAccessError, setPointsAccessError] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState<string | null>(null)

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  useEffect(() => {
    if (!open) return
    setResetPassword(null)
    setTab('profile')
  }, [open, user?.id])

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
            <Nav appearance="tabs" activeKey={tab} onSelect={(k) => setTab((k as typeof tab) ?? 'profile')}>
              <Nav.Item eventKey="profile">Профиль</Nav.Item>
              <Nav.Item eventKey="role">Роль</Nav.Item>
              <Nav.Item eventKey="distribution">Распределение</Nav.Item>
              <Nav.Item eventKey="reports">Отчёты</Nav.Item>
            </Nav>

            <div className={styles.left}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
              <div className={styles.roleBadge}>{userRoleLabel(user.role)}</div>
            </div>

            <div className={styles.right}>
              {tab === 'role' ? (
                actualMode === 'view' ? (
                  <div className={styles.grid}>
                    <Field label="Роль" value={userRoleLabel(user.role)} />
                    <Field
                      label="Права"
                      value={user.permissions?.length ? user.permissions.join(', ') : '—'}
                      isMonospace
                    />
                  </div>
                ) : (
                  <div className={styles.grid}>
                    <FieldEdit label="Роль *">
                      <SelectPicker
                        value={form.role}
                        onChange={(v) => {
                          const nextRole = ((v as UserRole) ?? 'manager')
                          setForm((p) => ({ ...p, role: nextRole, permissions: (DEFAULTS[nextRole] ?? []).slice() }))
                        }}
                        cleanable={false}
                        searchable={false}
                        block
                        data={userRoleOptions}
                      />
                    </FieldEdit>
                    <div className={styles.row}>
                      <div className={styles.label}>Группы безопасности</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setForm((p) => ({ ...p, permissions: (DEFAULTS[p.role] ?? []).slice() }))}
                        >
                          Сбросить к роли
                        </Button>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {PERMISSIONS.map((p) => {
                            const checked = form.permissions.includes(p.key)
                            return (
                              <Checkbox
                                key={p.key}
                                checked={checked}
                                onChange={(_, next) => {
                                  setForm((prev) => {
                                    const set = new Set(prev.permissions)
                                    if (next) set.add(p.key)
                                    else set.delete(p.key)
                                    return { ...prev, permissions: [...set] }
                                  })
                                }}
                              >
                                {p.label}
                              </Checkbox>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : tab !== 'profile' ? (
                <div className={styles.grid}>
                  {tab === 'distribution' ? <Field label="Распределение (клиенты/локации)" value="MVP: в разработке" /> : null}
                  {tab === 'reports' ? <Field label="Отчёты" value="MVP: в разработке" /> : null}
                </div>
              ) : actualMode === 'view' ? (
                <div className={styles.grid}>
                  <div className={styles.fullName}>
                    {user.firstName} {user.lastName}
                  </div>
                  <Field label="Компания" value={companyName} />
                  <Field label="Компания (профиль)" value={user.profileCompany || '—'} />
                  <Field label="Почта" value={user.email} isMonospace />
                  <Field label="Телефон" value={user.phone || '—'} isMonospace />
                  <Field label="Язык интерфейса" value={user.uiLanguage || 'ru'} isMonospace />
                  <Field label="Активен" value={user.isActive ? 'Да' : 'Нет'} />
                  <Field label="Заметка" value={user.note || '—'} />
                  <Field label="Создан" value={fmtDt(user.createdAt)} isMonospace />
                  <Field label="Последний вход" value={fmtDt(user.lastLoginAt)} isMonospace />
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
                  {resetPassword ? <Field label="Новый пароль" value={resetPassword} isMonospace /> : null}
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
                  <FieldEdit label="Компания (профиль)">
                    <Input value={form.profileCompany} onChange={(v) => setForm((p) => ({ ...p, profileCompany: String(v ?? '') }))} />
                  </FieldEdit>
                  <FieldEdit label="Роль *">
                    <SelectPicker
                      value={form.role}
                      onChange={(v) => {
                        const nextRole = ((v as UserRole) ?? 'manager')
                        setForm((p) => ({ ...p, role: nextRole, permissions: (DEFAULTS[nextRole] ?? []).slice() }))
                      }}
                      cleanable={false}
                      searchable={false}
                      block
                      data={userRoleOptions}
                    />
                  </FieldEdit>
                  <FieldEdit label="Язык интерфейса">
                    <SelectPicker
                      value={form.uiLanguage}
                      onChange={(v) => setForm((p) => ({ ...p, uiLanguage: String(v ?? 'ru') }))}
                      cleanable={false}
                      searchable={false}
                      block
                      data={[
                        { label: 'ru', value: 'ru' },
                        { label: 'en', value: 'en' },
                      ]}
                    />
                  </FieldEdit>
                  <FieldEdit label="Активен">
                    <SelectPicker
                      value={form.isActive ? 'true' : 'false'}
                      onChange={(v) => setForm((p) => ({ ...p, isActive: String(v ?? 'true') === 'true' }))}
                      cleanable={false}
                      searchable={false}
                      block
                      data={[
                        { label: 'Да', value: 'true' },
                        { label: 'Нет', value: 'false' },
                      ]}
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
                  <FieldEdit label="Пароль (опционально)">
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(v) => setForm((p) => ({ ...p, password: String(v ?? '') }))}
                      placeholder="Оставьте пустым, чтобы не менять"
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
                <Image src="/icons/close.svg" alt="" width={16} height={16} aria-hidden="true" />
              </IconButton>
              {user && canEdit ? (
                <IconButton label="Изменить" onClick={() => onModeChange('edit')} disabled={isLoading}>
                  <Image src="/icons/edit.svg" alt="" width={16} height={16} aria-hidden="true" />
                </IconButton>
              ) : null}
              {user && canEdit ? (
                <IconButton
                  label="Сбросить пароль"
                  onClick={() => {
                    const uid = user.id
                    axiosMainRequest
                      .post<{ password: string }>(apiRoutes.team.userResetPassword(uid))
                      .then((res) => setResetPassword(res.data.password || null))
                      .catch(() => setResetPassword(null))
                  }}
                  disabled={isLoading}
                >
                  <Image src="/icons/key.svg" alt="" width={16} height={16} aria-hidden="true" />
                </IconButton>
              ) : null}
              {user && canEdit ? (
                <IconButton
                  label={user.isActive ? 'Деактивировать' : 'Активировать'}
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
                <Image src="/icons/close.svg" alt="" width={16} height={16} aria-hidden="true" />
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
                    profileCompany: form.profileCompany.trim() || null,
                    uiLanguage: form.uiLanguage || 'ru',
                    isActive: Boolean(form.isActive),
                    permissions: form.permissions ?? [],
                      note: form.note.trim() || null,
                    password: form.password.trim() ? form.password.trim() : null,
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

