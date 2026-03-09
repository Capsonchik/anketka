'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { UserRole } from '@/entities/user'
import { userRoleOptions } from '@/entities/user'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import type { CreateUserResponse, MeResponse, TeamUser, TeamUserDetailsResponse, TeamUsersResponse } from '../model/types'
import { TeamAuditorsTab } from './TeamAuditorsTab'
import { TeamCreateUserModal, type CreateUserFormState } from './TeamCreateUserModal'
import { TeamTabs, type TeamTabKey } from './TeamTabs'
import { TeamUserCard } from './TeamUserCard'
import { TeamUserDetailsModal } from './TeamUserDetailsModal'
import styles from './TeamPage.module.css'

export function TeamPage () {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [myRole, setMyRole] = useState<UserRole | null>(null)
  const [myCompanyId, setMyCompanyId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

  const [tab, setTab] = useState<TeamTabKey>('users')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState<CreateUserFormState>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'manager',
    note: '',
  })

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<TeamUserDetailsResponse | null>(null)

  const hasFilters = useMemo(() => search.trim().length > 0 || roleFilter !== 'all', [roleFilter, search])

  function closeModal () {
    setIsModalOpen(false)
    setSubmitError(null)
    setSubmitSuccess(null)
    setCreateForm({ firstName: '', lastName: '', email: '', role: 'manager', note: '' })
  }

  function resetCreateForm () {
    setSubmitError(null)
    setSubmitSuccess(null)
    setCreateForm((prev) => ({ ...prev, firstName: '', lastName: '', email: '', note: '' }))
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

  async function loadUsers (opts?: { q?: string; role?: UserRole | 'all'; companyId?: string | null }) {
    setIsLoading(true)
    setError(null)
    try {
      const q = (opts?.q ?? search).trim()
      const r = opts?.role ?? roleFilter
      const companyId = opts?.companyId ?? myCompanyId
      const params: Record<string, string> = {}
      if (q) params.q = q
      if (r !== 'all') params.role = r

      const res = await axiosMainRequest.get<TeamUsersResponse>(apiRoutes.team.users, { params })
      const items = res.data.items ?? []
      const filtered = companyId ? items.filter((u) => u.company?.id === companyId) : items
      setUsers(filtered)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isAlive = true
    ;(async () => {
      let companyId: string | null = null
      try {
        const res = await axiosMainRequest.get<MeResponse>(apiRoutes.users.me)
        if (!isAlive) return
        setMyRole(res.data.role)
        companyId = res.data.company?.id ?? null
        setMyCompanyId(companyId)
      } catch {
        if (!isAlive) return
        setMyRole(null)
        companyId = null
        setMyCompanyId(null)
      } finally {
        if (!isAlive) return
        await loadUsers({ companyId })
      }
    })()

    return () => {
      isAlive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!myCompanyId) return
    const t = window.setTimeout(() => {
      loadUsers({ q: search, role: roleFilter })
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, myCompanyId])

  const isEmpty = !isLoading && !error && users.length === 0 && !hasFilters
  const isNoResults = !isLoading && !error && users.length === 0 && hasFilters

  async function submitCreate (mode: 'close' | 'keep') {
    setSubmitError(null)
    setSubmitSuccess(null)

    const fn = createForm.firstName.trim()
    const ln = createForm.lastName.trim()
    const em = createForm.email.trim()
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
        role: createForm.role,
        note: createForm.note.trim() || null,
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
        {tab === 'users' ? (
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
        ) : null}
      </div>

      <div className={styles.subTitle}>Управляйте участниками компании, их ролями и доступами.</div>

      <TeamTabs value={tab} onChange={setTab} />

      {tab === 'users' ? (
        isEmpty ? (
          <div className={styles.emptyState}>
            <Button type="button" variant="primary" onClick={() => setIsModalOpen(true)}>
              Добавить
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.filters}>
              <Input
                size='sm'
                className={styles.input}
                value={search}
                onChange={(value) => setSearch(String(value ?? ''))}
                placeholder="Поиск по имени, фамилии или почте…"
                aria-label="Поиск"
              />
              <SelectPicker
                size='sm'
                className={styles.select}
                value={roleFilter}
                onChange={(value) => setRoleFilter((value as UserRole | 'all') ?? 'all')}
                aria-label="Фильтр по роли"
                cleanable={false}
                searchable={false}
                block
                data={[
                  { label: 'Все роли', value: 'all' },
                  ...userRoleOptions,
                ]}
              />
            </div>

            {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
            {error ? <div className={styles.error}>{error}</div> : null}
            {isNoResults ? <div className={styles.hint}>Ничего не найдено</div> : null}

            <div className={styles.grid}>
              {users.map((u) => (
                <TeamUserCard key={u.id} user={u} onClick={() => openDetails(u.id)} />
              ))}
            </div>
          </>
        )
      ) : (
        <TeamAuditorsTab isAdmin={myRole === 'admin'} />
      )}

      <TeamUserDetailsModal
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        isLoading={detailsLoading}
        error={detailsError}
        details={details}
        isAdmin={myRole === 'admin'}
      />

      <TeamCreateUserModal
        open={isModalOpen}
        onClose={closeModal}
        isSubmitting={isSubmitting}
        submitError={submitError}
        submitSuccess={submitSuccess}
        form={createForm}
        onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
        onSubmitClose={() => submitCreate('close')}
        onSubmitKeep={() => submitCreate('keep')}
      />
    </div>
  )
}

