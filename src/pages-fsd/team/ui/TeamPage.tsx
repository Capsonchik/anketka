'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { UserRole } from '@/entities/user'
import { Button } from '@/shared/ui'

import { canEditTeamUser } from '../lib/canEditTeamUser'
import { downloadApiFile } from '../lib/downloadApiFile'
import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import { normalizeEmail, normalizePhone } from '../lib/normalizeContact'
import type { CreateUserResponse, TeamUser, TeamUserDetailsResponse, TeamUsersResponse } from '../model/types'
import type { TeamAuditorsTabHandle } from './TeamAuditorsTab'
import { TeamAuditorsTab } from './TeamAuditorsTab'
import { TeamCreateUserModal, type CreateUserFormState } from './TeamCreateUserModal'
import { TeamBulkAccessModal } from './TeamBulkAccessModal'
import { TeamTabs, type TeamTabKey } from './TeamTabs'
import { TeamUserAccessModal } from './TeamUserAccessModal'
import { TeamUserModal } from './TeamUserModal/TeamUserModal'
import { TeamUserLocationsModal } from './TeamUserLocationsModal'
import { TeamUsersImportModal } from './TeamUsersImportModal'
import type { TeamGroupsTabHandle } from './TeamGroupsTab'
import { TeamGroupsTab } from './TeamGroupsTab'
import { TeamUsersTab } from './TeamUsersTab'
import styles from './TeamPage.module.css'
import { useBootstrapData } from '@/shared/lib/bootstrap-data'

export function TeamPage () {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [myRole, setMyRole] = useState<UserRole | null>(null)
  const [myCompanyId, setMyCompanyId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [emailFilter, setEmailFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [idFilter, setIdFilter] = useState('')

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
    profileCompany: '',
    uiLanguage: 'ru',
    isActive: true,
    note: '',
    password: '',
  })

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<TeamUserDetailsResponse | null>(null)
  const [detailsMode, setDetailsMode] = useState<'view' | 'edit'>('view')
  const [isUsersImportOpen, setIsUsersImportOpen] = useState(false)
  const [isUsersExporting, setIsUsersExporting] = useState(false)
  const [isAuditorsExporting, setIsAuditorsExporting] = useState(false)
  const [accessUserId, setAccessUserId] = useState<string | null>(null)
  const [isAccessOpen, setIsAccessOpen] = useState(false)
  const [isBulkAccessOpen, setIsBulkAccessOpen] = useState(false)
  const [locationsUserId, setLocationsUserId] = useState<string | null>(null)
  const [isLocationsOpen, setIsLocationsOpen] = useState(false)

  const auditorsRef = useRef<TeamAuditorsTabHandle | null>(null)
  const groupsRef = useRef<TeamGroupsTabHandle | null>(null)
  const skipNextDebouncedLoadRef = useRef(false)

  const { me: bootMe, isLoading: isBootLoading, error: bootError } = useBootstrapData()

  const hasFilters = useMemo(() => search.trim().length > 0 || roleFilter !== 'all', [roleFilter, search])

  function closeModal () {
    setIsModalOpen(false)
    setSubmitError(null)
    setSubmitSuccess(null)
    setCreateForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'manager',
      profileCompany: '',
      uiLanguage: 'ru',
      isActive: true,
      note: '',
      password: '',
    })
  }

  function resetCreateForm () {
    setSubmitError(null)
    setSubmitSuccess(null)
    setCreateForm((prev) => ({ ...prev, firstName: '', lastName: '', email: '', phone: '', profileCompany: '', note: '', password: '' }))
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

  async function updateUser (
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
      note: string | null
      groupIds: string[]
      password: string | null
    },
  ) {
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      const { groupIds, ...userPatch } = patch
      await axiosMainRequest.patch(`${apiRoutes.team.users}/${userId}`, userPatch)
      await axiosMainRequest.put(apiRoutes.team.userGroups(userId), { groupIds })
      await loadUsers()
      await openDetails(userId, 'view')
    } catch (err: unknown) {
      setDetailsError(getApiErrorMessage(err))
      setDetailsLoading(false)
    }
  }

  async function toggleUserActive (userId: string) {
    const current = users.find((u) => u.id === userId) ?? details?.user ?? null
    if (!current) return
    const nextActive = !current.isActive
    const q = nextActive ? 'Активировать пользователя?' : 'Деактивировать пользователя?'
    if (!window.confirm(q)) return
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      await axiosMainRequest.patch(`${apiRoutes.team.users}/${userId}`, { isActive: nextActive })
      await loadUsers()
      if (details?.user?.id === userId) {
        await openDetails(userId, 'view')
      }
    } catch (err: unknown) {
      setDetailsError(getApiErrorMessage(err))
    } finally {
      setDetailsLoading(false)
    }
  }

  const canEditDetails = details?.user ? canEditTeamUser(myRole, details.user.role) : false

  function isUuid (value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
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
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active' ? 'true' : 'false'
      if (emailFilter.trim()) params.email = emailFilter.trim()
      if (phoneFilter.trim()) params.phone = phoneFilter.trim()
      if (companyFilter.trim()) params.profile_company = companyFilter.trim()
      if (idFilter.trim() && isUuid(idFilter.trim())) params.user_id = idFilter.trim()

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
    if (isBootLoading) return
    if (!bootMe) {
      if (bootError) {
        setMyRole(null)
        setMyCompanyId(null)
      }
      return
    }

    const companyId = bootMe.company?.id ?? null
    setMyRole(bootMe.role)
    setMyCompanyId(companyId)
    skipNextDebouncedLoadRef.current = true
    loadUsers({ companyId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootMe, isBootLoading, bootError])

  useEffect(() => {
    if (!myCompanyId) return
    if (skipNextDebouncedLoadRef.current) {
      skipNextDebouncedLoadRef.current = false
      return
    }
    const t = window.setTimeout(() => {
      loadUsers({ q: search, role: roleFilter })
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, activeFilter, emailFilter, phoneFilter, companyFilter, idFilter, myCompanyId])

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
        profileCompany: createForm.profileCompany.trim() || null,
        uiLanguage: createForm.uiLanguage || 'ru',
        isActive: Boolean(createForm.isActive),
        note: createForm.note.trim() || null,
        password: createForm.password.trim() || null,
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

  async function exportUsersXlsx () {
    setError(null)
    setIsUsersExporting(true)
    try {
      const params: Record<string, string | undefined> = {}
      if (search.trim()) params.q = search.trim()
      if (roleFilter !== 'all') params.role = roleFilter
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active' ? 'true' : 'false'
      if (emailFilter.trim()) params.email = emailFilter.trim()
      if (phoneFilter.trim()) params.phone = phoneFilter.trim()
      if (companyFilter.trim()) params.profile_company = companyFilter.trim()
      if (idFilter.trim() && isUuid(idFilter.trim())) params.user_id = idFilter.trim()

      await downloadApiFile({
        url: apiRoutes.team.usersExport,
        params,
        fallbackFilename: 'team-users.xlsx',
      })
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsUsersExporting(false)
    }
  }

  async function exportAuditorsXlsx () {
    setIsAuditorsExporting(true)
    try {
      await auditorsRef.current?.exportXlsx()
    } finally {
      setIsAuditorsExporting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className="titleH1">Команда</h1>
        <div className={styles.headerActions}>
          {tab === 'users' && (myRole === 'admin' || myRole === 'manager') ? (
            <button type="button" className={styles.headerTextButton} onClick={() => setIsBulkAccessOpen(true)}>
              Назначения
            </button>
          ) : null}
          {tab === 'users' && (myRole === 'admin' || myRole === 'manager') ? (
            <button type="button" className={styles.headerTextButton} onClick={() => setIsUsersImportOpen(true)}>
              Импорт Excel
            </button>
          ) : null}
          {tab === 'users' && (myRole === 'admin' || myRole === 'manager') ? (
            <button type="button" className={styles.headerTextButton} disabled={isUsersExporting} onClick={exportUsersXlsx}>
              {isUsersExporting ? 'Экспорт…' : 'Экспорт Excel'}
            </button>
          ) : null}

          {tab === 'users' ? (
            <button
              type="button"
              className={styles.addIconButton}
              aria-label="Добавить участника"
              disabled={!(myRole === 'admin' || myRole === 'manager')}
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
          {tab === 'auditors' && myRole === 'admin' ? (
            <button type="button" className={styles.headerTextButton} disabled={isAuditorsExporting} onClick={exportAuditorsXlsx}>
              {isAuditorsExporting ? 'Экспорт…' : 'Экспорт Excel'}
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

          {tab === 'groups' ? (
            <button
              type="button"
              className={styles.addIconButton}
              aria-label="Создать группу"
              disabled={!(myRole === 'admin' || myRole === 'manager')}
              onClick={() => groupsRef.current?.openCreate()}
            >
              <Image src="/icons/add.svg" alt="" width={18} height={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.subTitle}>Управляйте участниками компании, их ролями и доступами.</div>

      <TeamTabs value={tab} onChange={setTab} />

      <div className={styles.contentArea}>
        {tab === 'users' ? (
          <>
            <TeamUsersTab
              users={users}
              isLoading={isLoading}
              error={error}
              isNoResults={isNoResults}
              isEmpty={isEmpty}
              search={search}
              roleFilter={roleFilter}
              activeFilter={activeFilter}
              emailFilter={emailFilter}
              phoneFilter={phoneFilter}
              companyFilter={companyFilter}
              idFilter={idFilter}
              onSearchChange={setSearch}
              onRoleFilterChange={setRoleFilter}
              onActiveFilterChange={setActiveFilter}
              onEmailFilterChange={setEmailFilter}
              onPhoneFilterChange={setPhoneFilter}
              onCompanyFilterChange={setCompanyFilter}
              onIdFilterChange={setIdFilter}
              isAdmin={myRole === 'admin'}
              canManageAccess={myRole === 'admin' || myRole === 'manager'}
              canEditUser={(u) => canEditTeamUser(myRole, u.role)}
              onOpenDetails={(userId) => openDetails(userId, 'view')}
              onEdit={(userId) => openDetails(userId, 'edit')}
              onAccess={(userId) => {
                setAccessUserId(userId)
                setIsAccessOpen(true)
              }}
              onLocations={(userId) => {
                setLocationsUserId(userId)
                setIsLocationsOpen(true)
              }}
              onDelete={toggleUserActive}
              onAdd={() => setIsModalOpen(true)}
              canAdd={myRole === 'admin' || myRole === 'manager'}
            />
          </>
        ) : tab === 'groups' ? (
          <TeamGroupsTab ref={groupsRef} active={tab === 'groups'} users={users} canManage={myRole === 'admin' || myRole === 'manager'} />
        ) : (
          <TeamAuditorsTab ref={auditorsRef} isAdmin={myRole === 'admin'} />
        )}
      </div>

      <TeamUserModal
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
        onDelete={toggleUserActive}
        onCloned={async (userId) => {
          await loadUsers()
          await openDetails(userId, 'view')
        }}
      />

      <TeamUserAccessModal
        open={isAccessOpen}
        userId={accessUserId}
        canEdit={myRole === 'admin' || myRole === 'manager'}
        onClose={() => {
          setIsAccessOpen(false)
          setAccessUserId(null)
        }}
      />

      <TeamUserLocationsModal
        open={isLocationsOpen}
        userId={locationsUserId}
        canEdit={myRole === 'admin' || myRole === 'manager'}
        onClose={() => {
          setIsLocationsOpen(false)
          setLocationsUserId(null)
        }}
      />

      <TeamBulkAccessModal
        open={isBulkAccessOpen}
        onClose={() => setIsBulkAccessOpen(false)}
        users={users}
        canEdit={myRole === 'admin' || myRole === 'manager'}
        onDone={() => loadUsers()}
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
        disabled={!(myRole === 'admin' || myRole === 'manager')}
        onImported={() => loadUsers()}
      />
    </div>
  )
}

