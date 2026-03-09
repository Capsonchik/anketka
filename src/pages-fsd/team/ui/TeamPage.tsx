'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { UserRole } from '@/entities/user'
import { Button } from '@/shared/ui'

import { canEditTeamUser } from '../lib/canEditTeamUser'
import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import { normalizeEmail, normalizePhone } from '../lib/normalizeContact'
import type { CreateUserResponse, MeResponse, TeamUser, TeamUserDetailsResponse, TeamUsersResponse } from '../model/types'
import type { TeamAuditorsTabHandle } from './TeamAuditorsTab'
import { TeamAuditorsTab } from './TeamAuditorsTab'
import { TeamCreateUserModal, type CreateUserFormState } from './TeamCreateUserModal'
import { TeamTabs, type TeamTabKey } from './TeamTabs'
import { TeamUserDetailsModal } from './TeamUserDetailsModal'
import { TeamUsersImportModal } from './TeamUsersImportModal'
import { TeamUsersTab } from './TeamUsersTab'
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
    phone: '',
    role: 'manager',
    note: '',
  })

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<TeamUserDetailsResponse | null>(null)
  const [detailsMode, setDetailsMode] = useState<'view' | 'edit'>('view')
  const [isUsersImportOpen, setIsUsersImportOpen] = useState(false)

  const auditorsRef = useRef<TeamAuditorsTabHandle | null>(null)

  const hasFilters = useMemo(() => search.trim().length > 0 || roleFilter !== 'all', [roleFilter, search])

  function closeModal () {
    setIsModalOpen(false)
    setSubmitError(null)
    setSubmitSuccess(null)
    setCreateForm({ firstName: '', lastName: '', email: '', phone: '', role: 'manager', note: '' })
  }

  function resetCreateForm () {
    setSubmitError(null)
    setSubmitSuccess(null)
    setCreateForm((prev) => ({ ...prev, firstName: '', lastName: '', email: '', phone: '', note: '' }))
  }

  async function openDetails (userId: string, mode: 'view' | 'edit' = 'view') {
    setIsDetailsOpen(true)
    setDetailsLoading(true)
    setDetailsError(null)
    setDetails(null)
    setDetailsMode(mode)

    try {
      const res = await axiosMainRequest.get<TeamUserDetailsResponse>(`${apiRoutes.team.users}/${userId}`)
      setDetails(res.data)
      if (mode === 'edit' && !canEditTeamUser(myRole, res.data.user.role)) {
        setDetailsMode('view')
      }
    } catch (err: unknown) {
      setDetailsError(getApiErrorMessage(err))
    } finally {
      setDetailsLoading(false)
    }
  }

  async function updateUser (userId: string, patch: { firstName: string; lastName: string; email: string; phone: string | null; role: UserRole; note: string | null }) {
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      await axiosMainRequest.patch(`${apiRoutes.team.users}/${userId}`, patch)
      await loadUsers()
      await openDetails(userId, 'view')
    } catch (err: unknown) {
      setDetailsError(getApiErrorMessage(err))
      setDetailsLoading(false)
    }
  }

  async function deleteUser (userId: string) {
    if (!window.confirm('Удалить пользователя?')) return
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      await axiosMainRequest.delete(`${apiRoutes.team.users}/${userId}`)
      await loadUsers()
      setIsDetailsOpen(false)
      setDetails(null)
      setDetailsMode('view')
    } catch (err: unknown) {
      setDetailsError(getApiErrorMessage(err))
    } finally {
      setDetailsLoading(false)
    }
  }

  const canEditDetails = details?.user ? canEditTeamUser(myRole, details.user.role) : false

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
    const phone = createForm.phone.trim()
    if (!fn || !ln || !em) {
      setSubmitError('Заполните обязательные поля')
      return
    }

    const emailNorm = normalizeEmail(em)
    const phoneNorm = normalizePhone(phone)
    const emailExists = users.some((u) => normalizeEmail(u.email) === emailNorm)
    const phoneExists = phoneNorm ? users.some((u) => normalizePhone(u.phone) === phoneNorm) : false

    if (emailExists) {
      setSubmitError('Участник с такой почтой уже существует')
      return
    }
    if (phoneExists) {
      setSubmitError('Участник с таким телефоном уже существует')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await axiosMainRequest.post<CreateUserResponse>(apiRoutes.team.users, {
        firstName: fn,
        lastName: ln,
        email: em,
        phone: phone || null,
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
        <div className={styles.headerActions}>
          {tab === 'users' && myRole === 'admin' ? (
            <button type="button" className={styles.headerTextButton} onClick={() => setIsUsersImportOpen(true)}>
              Импорт Excel
            </button>
          ) : null}

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
              <Image src="/icons/add.svg" alt="" width={18} height={18} aria-hidden="true" />
            </button>
          ) : null}

          {tab === 'auditors' && myRole === 'admin' ? (
            <button type="button" className={styles.headerTextButton} onClick={() => auditorsRef.current?.openImport()}>
              Импорт Excel
            </button>
          ) : null}

          {tab === 'auditors' ? (
            <button
              type="button"
              className={styles.addIconButton}
              aria-label="Добавить аудитора"
              disabled={myRole !== 'admin'}
              onClick={() => auditorsRef.current?.openCreate()}
            >
              <Image src="/icons/add.svg" alt="" width={18} height={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
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
            <TeamUsersTab
              users={users}
              isLoading={isLoading}
              error={error}
              isNoResults={isNoResults}
              search={search}
              roleFilter={roleFilter}
              onSearchChange={setSearch}
              onRoleFilterChange={setRoleFilter}
              isAdmin={myRole === 'admin'}
              canEditUser={(u) => canEditTeamUser(myRole, u.role)}
              onOpenDetails={(userId) => openDetails(userId, 'view')}
              onEdit={(userId) => openDetails(userId, 'edit')}
              onDelete={deleteUser}
            />
          </>
        )
      ) : (
        <TeamAuditorsTab ref={auditorsRef} isAdmin={myRole === 'admin'} />
      )}

      <TeamUserDetailsModal
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        isLoading={detailsLoading}
        error={detailsError}
        details={details}
        isAdmin={myRole === 'admin'}
        canEdit={canEditDetails}
        mode={detailsMode}
        onModeChange={setDetailsMode}
        onSave={updateUser}
        onDelete={deleteUser}
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

      <TeamUsersImportModal
        open={isUsersImportOpen}
        onClose={() => setIsUsersImportOpen(false)}
        disabled={myRole !== 'admin'}
        onImported={() => loadUsers()}
      />
    </div>
  )
}

