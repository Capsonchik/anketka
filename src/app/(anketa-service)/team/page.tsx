
'use client'

import { useEffect, useMemo, useState } from 'react'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import styles from './styles.module.css'

type Role = 'admin' | 'coordinator' | 'manager'

type TeamUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Role
  note: string | null
  createdAt: string
}

type TeamUsersResponse = {
  items: TeamUser[]
}

type CreateUserResponse = {
  user: TeamUser
  temporaryPassword: string
}

type MeResponse = {
  role: Role
}

type TeamUserDetailsResponse = {
  user: TeamUser
  password: string | null
}

function roleLabel (role: Role) {
  if (role === 'admin') return 'Админ'
  if (role === 'coordinator') return 'Координатор'
  return 'Менеджер'
}

function getApiErrorMessage (err: unknown): string {
  if (typeof err === 'object' && err) {
    const response = (err as { response?: unknown }).response
    if (typeof response === 'object' && response) {
      const data = (response as { data?: unknown }).data
      const detail = (data as { detail?: unknown } | undefined)?.detail
      if (typeof detail === 'string' && detail.trim()) return detail
    }
  }

  if (err instanceof Error && err.message) return err.message
  return 'Ошибка запроса'
}

export default function TeamPage () {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [myRole, setMyRole] = useState<Role | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('manager')
  const [note, setNote] = useState('')

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<TeamUserDetailsResponse | null>(null)

  const hasFilters = useMemo(() => search.trim().length > 0 || roleFilter !== 'all', [roleFilter, search])

  function closeModal () {
    setIsModalOpen(false)
    setSubmitError(null)
    setSubmitSuccess(null)
    setFirstName('')
    setLastName('')
    setEmail('')
    setRole('manager')
    setNote('')
  }

  function resetCreateForm () {
    setSubmitError(null)
    setSubmitSuccess(null)
    setFirstName('')
    setLastName('')
    setEmail('')
    setNote('')
  }

  async function openDetails (userId: string) {
    setIsDetailsOpen(true)
    setDetailsLoading(true)
    setDetailsError(null)
    setDetails(null)

    try {
      const res = await axiosMainRequest.get<TeamUserDetailsResponse>(`${apiRoutes.team.users}/${userId}`)
      setDetails(res.data)
    } catch (err: unknown) {
      setDetailsError(getApiErrorMessage(err))
    } finally {
      setDetailsLoading(false)
    }
  }

  async function loadUsers (opts?: { q?: string; role?: Role | 'all' }) {
    setIsLoading(true)
    setError(null)
    try {
      const q = (opts?.q ?? search).trim()
      const r = opts?.role ?? roleFilter
      const params: Record<string, string> = {}
      if (q) params.q = q
      if (r !== 'all') params.role = r

      const res = await axiosMainRequest.get<TeamUsersResponse>(apiRoutes.team.users, { params })
      setUsers(res.data.items ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    axiosMainRequest
      .get<MeResponse>(apiRoutes.users.me)
      .then((res) => setMyRole(res.data.role))
      .catch(() => setMyRole(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadUsers({ q: search, role: roleFilter })
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter])

  const isEmpty = !isLoading && !error && users.length === 0 && !hasFilters
  const isNoResults = !isLoading && !error && users.length === 0 && hasFilters

  async function submitCreate (mode: 'close' | 'keep') {
    setSubmitError(null)
    setSubmitSuccess(null)

    const fn = firstName.trim()
    const ln = lastName.trim()
    const em = email.trim()
    if (!fn || !ln || !em) {
      setSubmitError('Заполните обязательные поля')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await axiosMainRequest.post<CreateUserResponse>(apiRoutes.team.users, {
        firstName: fn,
        lastName: ln,
        email: em,
        role,
        note: note.trim() || null,
      })

      await loadUsers()

      const createdUserId = res.data?.user?.id
      const pw = res.data?.temporaryPassword
      setSubmitSuccess(pw ? `Создано. Пароль: ${pw}` : 'Создано')

      if (mode === 'close') {
        closeModal()
        if (createdUserId) {
          openDetails(createdUserId)
        }
      } else {
        resetCreateForm()
      }
    } catch (err: unknown) {
      setSubmitError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className="titleH1">Команда</h1>
        <button
          type="button"
          className={styles.addIconButton}
          aria-label="Добавить участника"
          onClick={() => {
            setSubmitError(null)
            setSubmitSuccess(null)
            setIsModalOpen(true)
          }}
        >
          +
        </button>
      </div>

      <div className={styles.subTitle}>
        Управляйте участниками компании, их ролями и доступами.
      </div>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <Button type="button" variant="primary" onClick={() => setIsModalOpen(true)}>
            Добавить
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.filters}>
            <input
              className={styles.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, фамилии или почте…"
              aria-label="Поиск"
            />
            <select
              className={styles.select}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
              aria-label="Фильтр по роли"
            >
              <option value="all">Все роли</option>
              <option value="admin">Админ</option>
              <option value="coordinator">Координатор</option>
              <option value="manager">Менеджер</option>
            </select>
          </div>

          {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}
          {isNoResults ? <div className={styles.hint}>Ничего не найдено</div> : null}

          <div className={styles.grid}>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className={styles.card}
                onClick={() => openDetails(u.id)}
                aria-label={`Открыть пользователя ${u.firstName} ${u.lastName}`}
              >
                <div className={styles.cardAvatar} aria-hidden="true" />
                <div className={styles.cardText}>
                  <div className={styles.cardNameRow}>
                    <div className={styles.cardFirstName}>{u.firstName}</div>
                    <div className={styles.cardLastName}>{u.lastName}</div>
                  </div>
                  <div className={styles.cardEmail}>{u.email}</div>
                  <div className={styles.cardRole}>{roleLabel(u.role)}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className={styles.modalRoot} data-open={isDetailsOpen ? 'true' : 'false'}>
        <div
          className={styles.modalOverlay}
          onClick={() => setIsDetailsOpen(false)}
          aria-hidden="true"
        />
        <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Участник">
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Участник</div>
            <button
              type="button"
              className={styles.modalClose}
              aria-label="Закрыть"
              onClick={() => setIsDetailsOpen(false)}
            >
              ×
            </button>
          </div>

          {detailsLoading ? <div className={styles.hint}>Загрузка…</div> : null}
          {detailsError ? <div className={styles.error}>{detailsError}</div> : null}

          {details && !detailsLoading && !detailsError ? (
            <div className={styles.detailsList}>
              <div className={styles.detailsRow}>
                <div className={styles.detailsLabel}>Имя</div>
                <div className={styles.detailsValue}>{details.user.firstName}</div>
              </div>
              <div className={styles.detailsRow}>
                <div className={styles.detailsLabel}>Фамилия</div>
                <div className={styles.detailsValue}>{details.user.lastName}</div>
              </div>
              <div className={styles.detailsRow}>
                <div className={styles.detailsLabel}>Почта</div>
                <div className={styles.detailsValue}>{details.user.email}</div>
              </div>
              <div className={styles.detailsRow}>
                <div className={styles.detailsLabel}>Роль</div>
                <div className={styles.detailsValue}>{roleLabel(details.user.role)}</div>
              </div>
              <div className={styles.detailsRow}>
                <div className={styles.detailsLabel}>Заметка</div>
                <div className={styles.detailsValue}>{details.user.note || '—'}</div>
              </div>

              {myRole === 'admin' ? (
                <div className={styles.detailsRow}>
                  <div className={styles.detailsLabel}>Пароль</div>
                  <div className={[styles.detailsValue, styles.passwordValue].join(' ')}>
                    {details.password || '—'}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.modalRoot} data-open={isModalOpen ? 'true' : 'false'}>
        <div
          className={styles.modalOverlay}
          onClick={() => closeModal()}
          aria-hidden="true"
        />
        <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Добавить участника">
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Новый участник</div>
            <button type="button" className={styles.modalClose} aria-label="Закрыть" onClick={() => closeModal()}>
              ×
            </button>
          </div>

          <div className={styles.modalGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Имя *</span>
              <input className={styles.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Фамилия *</span>
              <input className={styles.input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Почта *</span>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Роль *</span>
              <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="admin">Админ</option>
                <option value="coordinator">Координатор</option>
                <option value="manager">Менеджер</option>
              </select>
            </label>

            <label className={styles.fieldFull}>
              <span className={styles.fieldLabel}>Заметка</span>
              <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </label>
          </div>

          {submitError ? <div className={styles.error}>{submitError}</div> : null}
          {submitSuccess ? <div className={styles.success}>{submitSuccess}</div> : null}

          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              fullWidth
              onClick={() => closeModal()}
            >
              Закрыть
            </Button>
            <Button type="button" variant="secondary" disabled={isSubmitting} fullWidth onClick={() => submitCreate('keep')}>
              Создать и добавить еще 
            </Button>
            <Button type="button" variant="primary" disabled={isSubmitting} fullWidth onClick={() => submitCreate('close')}>
              Создать
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

