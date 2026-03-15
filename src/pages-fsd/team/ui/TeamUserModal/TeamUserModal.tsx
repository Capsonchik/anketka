'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal, Nav } from 'rsuite'
import Image from 'next/image'
import type { AxiosError } from 'axios'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { userDefaultPermissionsByRole, userRoleLabel, type UserRole } from '@/entities/user'
import type { ShopPointItem, ShopPointsResponse } from '@/pages-fsd/project/model/types'
import { PageLoader } from '@/shared/ui'
import type {
  CompanyFilterValuesResponse,
  ReplaceUserCompaniesAccessRequest,
  ReplaceUserCompanyDistributionRequest,
  ReplaceUserCompanyReportsRequest,
  TeamUserDetailsResponse,
  UserCompaniesAccessResponse,
  UserCompanyDistributionResponse,
  UserCompanyReportsResponse,
  UserGroupsForUserResponse,
  UserGroupsResponse,
  UserPointAccessResponse,
  UserProjectAccessResponse,
} from '../../model/types'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'

import styles from './TeamUserModal.module.css'
import { TeamUserModalDistributionTab } from './TeamUserModalDistributionTab'
import { TeamUserModalProfileTab } from './TeamUserModalProfileTab'
import { TeamUserModalReportsTab } from './TeamUserModalReportsTab'
import { TeamUserModalRoleTab } from './TeamUserModalRoleTab'
import { TeamUserCloneModal } from '../TeamUserCloneModal'

function fmtDt (value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
}

function companiesAccessErrorMessage (err: unknown) {
  const axiosErr = err as AxiosError<{ message?: string }>
  const status = axiosErr?.response?.status
  const backendMessage = axiosErr?.response?.data?.message

  if (status && status >= 500) return 'Не удалось загрузить клиентов: внутренняя ошибка сервера'
  if (backendMessage) return backendMessage
  return 'Не удалось загрузить клиентов'
}

const REPORTS: Array<{ key: string; label: string }> = [
  { key: 'checks.summary', label: 'Сводка по проверкам' },
  { key: 'checks.by-region', label: 'Проверки по регионам' },
  { key: 'appeals.summary', label: 'Апелляции' },
  { key: 'auditors.activity', label: 'Активность аудиторов' },
  { key: 'media.usage', label: 'Медиа (фото/видео)' },
  { key: 'exports.history', label: 'История выгрузок' },
]

export function TeamUserModal ({
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
  onCloned,
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
      groupIds: string[]
      note: string | null
      password: string | null
    },
  ) => void | Promise<void>
  onDelete: (userId: string) => void | Promise<void>
  onCloned?: (userId: string) => void | Promise<void>
}) {
  const user = details?.user
  const initials = user ? getInitials(user.firstName, user.lastName) : '—'
  const companyName = user?.company?.name || '—'
  const password = isAdmin ? (details?.password ?? null) : null
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
      permissions: (user?.permissions ?? userDefaultPermissionsByRole[(user?.role ?? 'manager') as UserRole] ?? []).slice(),
      groupIds: [] as string[],
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
  const [allGroups, setAllGroups] = useState<Array<{ id: string; name: string }>>([])
  const [groupsError, setGroupsError] = useState<string | null>(null)

  const [companiesAccess, setCompaniesAccess] = useState<UserCompaniesAccessResponse | null>(null)
  const [companiesError, setCompaniesError] = useState<string | null>(null)
  const [isCompanyAccessSaving, setIsCompanyAccessSaving] = useState(false)
  const [activeDistributionCompanyId, setActiveDistributionCompanyId] = useState<string | null>(null)
  const [dist, setDist] = useState<UserCompanyDistributionResponse | null>(null)
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({})
  const [filterTitles, setFilterTitles] = useState<Record<string, string>>({})
  const [distError, setDistError] = useState<string | null>(null)
  const [distDraft, setDistDraft] = useState<ReplaceUserCompanyDistributionRequest>({ filterValues: {}, pointIds: [] })
  const [isDistSaving, setIsDistSaving] = useState(false)

  const [points, setPoints] = useState<ShopPointItem[]>([])
  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointsQ, setPointsQ] = useState('')
  const [pointsRegion, setPointsRegion] = useState<string | null>(null)

  const [reportsCompanyId, setReportsCompanyId] = useState<string | null>(null)
  const [reports, setReports] = useState<UserCompanyReportsResponse | null>(null)
  const [reportsDraft, setReportsDraft] = useState<ReplaceUserCompanyReportsRequest>({ reportKeys: [] })
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [isReportsSaving, setIsReportsSaving] = useState(false)

  const [isCloneOpen, setIsCloneOpen] = useState(false)

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
    const shouldLoadGroups = tab === 'role'
    if (!open || !uid || !shouldLoadGroups) {
      setAllGroups([])
      setGroupsError(null)
      return
    }
    let isAlive = true
    setGroupsError(null)
    Promise.all([
      axiosMainRequest.get<UserGroupsResponse>(apiRoutes.team.groups),
      axiosMainRequest.get<UserGroupsForUserResponse>(apiRoutes.team.userGroups(uid)),
    ])
      .then(([gRes, uRes]) => {
        if (!isAlive) return
        const groups = (gRes.data.items ?? []).map((x) => ({ id: x.id, name: x.name }))
        setAllGroups(groups)
        setForm((prev) => ({ ...prev, groupIds: uRes.data.groupIds ?? [] }))
      })
      .catch((err: unknown) => {
        if (!isAlive) return
        setAllGroups([])
        setGroupsError(err instanceof Error ? err.message : 'Не удалось загрузить группы')
      })
    return () => {
      isAlive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualMode, canEdit, open, tab, user?.id])

  useEffect(() => {
    const uid = user?.id
    const needsCompaniesAccess = tab === 'distribution' || tab === 'reports'
    if (!open || !uid || !canEdit || !needsCompaniesAccess) {
      setCompaniesAccess(null)
      setCompaniesError(null)
      setActiveDistributionCompanyId(null)
      setDist(null)
      setFilterOptions({})
      setDistError(null)
      return
    }
    let isAlive = true
    setCompaniesError(null)
    axiosMainRequest
      .get<UserCompaniesAccessResponse>(apiRoutes.team.userCompaniesAccess(uid))
      .then((res) => {
        if (!isAlive) return
        setCompaniesAccess(res.data)
        const first = res.data.items?.[0]?.id ?? null
        setActiveDistributionCompanyId((prev) => prev ?? first)
      })
      .catch((err: unknown) => {
        if (!isAlive) return
        setCompaniesAccess(null)
        setCompaniesError(companiesAccessErrorMessage(err))
      })
    return () => {
      isAlive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, canEdit, tab])

  useEffect(() => {
    const uid = user?.id
    const cid = activeDistributionCompanyId
    const shouldLoadDistribution = tab === 'distribution'
    if (!open || !uid || !cid || !canEdit || !shouldLoadDistribution) {
      setDist(null)
      setFilterOptions({})
      setDistError(null)
      return
    }
    let isAlive = true
    setDistError(null)
    setDistDraft({ filterValues: {}, pointIds: [] })
    Promise.all([
      axiosMainRequest.get<UserCompanyDistributionResponse>(apiRoutes.team.userCompanyDistribution(uid, cid)),
      axiosMainRequest.get<CompanyFilterValuesResponse>(apiRoutes.team.companyFilterValues(cid)),
    ])
      .then(([dRes, fRes]) => {
        if (!isAlive) return
        setDist(dRes.data)
        const map: Record<string, string[]> = {}
        const titles: Record<string, string> = {}
        for (const it of fRes.data.items ?? []) {
          map[it.key] = it.values ?? []
          if (it.title) titles[it.key] = it.title
        }
        setFilterOptions(map)
        setFilterTitles(titles)
      })
      .catch((err: unknown) => {
        if (!isAlive) return
        setDist(null)
        setFilterOptions({})
        setFilterTitles({})
        setDistError(err instanceof Error ? err.message : 'Не удалось загрузить распределение')
      })
    return () => {
      isAlive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, activeDistributionCompanyId, canEdit, tab])

  useEffect(() => {
    if (!dist) return
    setDistDraft({
      filterValues: (dist.filterValues ?? {}) as Record<string, string[]>,
      pointIds: dist.pointIds ?? [],
    })
  }, [dist])

  useEffect(() => {
    if (!companiesAccess?.items?.length) return
    setReportsCompanyId((prev) => prev ?? companiesAccess.items[0].id)
  }, [companiesAccess?.items])

  useEffect(() => {
    const uid = user?.id
    const cid = reportsCompanyId
    const shouldLoadReports = tab === 'reports'
    if (!open || !uid || !cid || !canEdit || !shouldLoadReports) {
      setReports(null)
      setReportsDraft({ reportKeys: [] })
      setReportsError(null)
      return
    }
    let isAlive = true
    setReportsError(null)
    axiosMainRequest
      .get<UserCompanyReportsResponse>(apiRoutes.team.userCompanyReports(uid, cid))
      .then((res) => {
        if (!isAlive) return
        setReports(res.data)
        setReportsDraft({ reportKeys: res.data.reportKeys ?? [] })
      })
      .catch((err: unknown) => {
        if (!isAlive) return
        setReports(null)
        setReportsDraft({ reportKeys: [] })
        setReportsError(err instanceof Error ? err.message : 'Не удалось загрузить отчёты')
      })
    return () => {
      isAlive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, reportsCompanyId, canEdit, tab])

  useEffect(() => {
    const uid = user?.id
    const cid = activeDistributionCompanyId
    const shouldLoadDistributionPoints = tab === 'distribution'
    if (!open || !uid || !cid || !canEdit || actualMode !== 'edit' || !shouldLoadDistributionPoints) {
      setPoints([])
      setPointsLoading(false)
      return
    }
    const company = (companiesAccess?.items ?? []).find((x) => x.id === cid)
    const projectId = company?.baseApProjectId
    if (!projectId) {
      setPoints([])
      setPointsLoading(false)
      return
    }

    let isAlive = true
    setPointsLoading(true)
    const t = window.setTimeout(() => {
      const params: Record<string, string> = {}
      if (pointsQ.trim()) params.q = pointsQ.trim()
      if (pointsRegion) params.regionCode = pointsRegion
      axiosMainRequest
        .get<ShopPointsResponse>(apiRoutes.projects.addressbook(projectId), { params, headers: { 'X-Company-Id': cid } })
        .then((res) => {
          if (!isAlive) return
          setPoints(res.data.items ?? [])
        })
        .catch(() => {
          if (!isAlive) return
          setPoints([])
        })
        .finally(() => {
          if (!isAlive) return
          setPointsLoading(false)
        })
    }, 250)

    return () => {
      isAlive = false
      window.clearTimeout(t)
    }
  }, [actualMode, canEdit, companiesAccess?.items, open, pointsQ, pointsRegion, tab, user?.id, activeDistributionCompanyId])

  useEffect(() => {
    const uid = user?.id
    const shouldLoadProfileAccess = tab === 'profile' && actualMode === 'view'
    if (!open || !uid || !isAdmin || !shouldLoadProfileAccess) {
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
  }, [actualMode, isAdmin, open, tab, user?.id])

  const handleToggleCompanyAccess = (next: boolean) => {
    if (!user?.id || !companiesAccess || !activeDistributionCompanyId) return
    const cid = activeDistributionCompanyId
    const prev = companiesAccess.items ?? []
    const nextIds = new Set(prev.filter((x) => x.hasAccess).map((x) => x.id))
    if (next) nextIds.add(cid)
    else nextIds.delete(cid)
    const payload: ReplaceUserCompaniesAccessRequest = { companyIds: [...nextIds] }
    setIsCompanyAccessSaving(true)
    axiosMainRequest
      .put<UserCompaniesAccessResponse>(apiRoutes.team.userCompaniesAccess(user.id), payload)
      .then((res) => setCompaniesAccess(res.data))
      .catch((err: unknown) => setCompaniesError(getApiErrorMessage(err)))
      .finally(() => setIsCompanyAccessSaving(false))
  }

  const handleSaveDistribution = () => {
    const userId = user?.id
    const companyId = activeDistributionCompanyId
    if (!userId || !companyId || isCompanyAccessSaving) return
    const isHomeCompany = companyId === user?.company?.id
    const hasClientAccess = Boolean((companiesAccess?.items ?? []).find((x) => x.id === companyId)?.hasAccess)
    if (!isHomeCompany && !hasClientAccess) {
      setDistError('Сначала выдайте доступ пользователю к клиенту')
      return
    }
    setIsDistSaving(true)
    setDistError(null)
    const payload: ReplaceUserCompanyDistributionRequest = {
      filterValues: distDraft.filterValues ?? {},
      pointIds: distDraft.pointIds ?? [],
    }
    axiosMainRequest
      .put<UserCompanyDistributionResponse>(apiRoutes.team.userCompanyDistribution(userId, companyId), payload)
      .then((res) => setDist(res.data))
      .catch((err: unknown) => setDistError(getApiErrorMessage(err)))
      .finally(() => setIsDistSaving(false))
  }

  const handleSaveReports = () => {
    const userId = user?.id
    if (!userId || !reportsCompanyId) return
    setIsReportsSaving(true)
    setReportsError(null)
    const payload: ReplaceUserCompanyReportsRequest = { reportKeys: reportsDraft.reportKeys ?? [] }
    axiosMainRequest
      .put<UserCompanyReportsResponse>(apiRoutes.team.userCompanyReports(userId, reportsCompanyId), payload)
      .then((res) => {
        setReports(res.data)
        setReportsDraft({ reportKeys: res.data.reportKeys ?? [] })
      })
      .catch((err: unknown) => setReportsError(err instanceof Error ? err.message : 'Не удалось сохранить'))
      .finally(() => setIsReportsSaving(false))
  }

  const tabContent = !user ? null : tab === 'role' ? (
      <TeamUserModalRoleTab
        actualMode={actualMode}
        userRole={user.role}
        userPermissionsValue={user.permissions ?? []}
        formRole={form.role}
        formPermissions={form.permissions}
        formGroupIds={form.groupIds}
        allGroups={allGroups}
        groupsError={groupsError}
        onRoleChange={(role) => setForm((prev) => ({ ...prev, role }))}
        onPermissionsChange={(permissions) => setForm((prev) => ({ ...prev, permissions }))}
        onGroupIdsChange={(groupIds) => setForm((prev) => ({ ...prev, groupIds }))}
      />
    ) : tab === 'distribution' ? (
      <TeamUserModalDistributionTab
        actualMode={actualMode}
        companiesAccess={companiesAccess}
        companiesError={companiesError}
        distError={distError}
        isCompanyAccessSaving={isCompanyAccessSaving}
        activeDistributionCompanyId={activeDistributionCompanyId}
        filterOptions={filterOptions}
        filterTitles={filterTitles}
        distDraft={distDraft}
        points={points}
        pointsLoading={pointsLoading}
        pointsQ={pointsQ}
        pointsRegion={pointsRegion}
        isDistSaving={isDistSaving}
        onActiveDistributionCompanyIdChange={setActiveDistributionCompanyId}
        onToggleCompanyAccess={handleToggleCompanyAccess}
        onDistDraftChange={setDistDraft}
        onPointsQChange={setPointsQ}
        onPointsRegionChange={setPointsRegion}
        onSave={handleSaveDistribution}
      />
    ) : tab === 'reports' ? (
      <TeamUserModalReportsTab
        actualMode={actualMode}
        reportsError={reportsError}
        reportsCompanyId={reportsCompanyId}
        companiesAccess={companiesAccess}
        reportOptions={REPORTS}
        reportsDraft={reportsDraft}
        isReportsSaving={isReportsSaving}
        reports={reports}
        onReportsCompanyIdChange={setReportsCompanyId}
        onReportsDraftChange={setReportsDraft}
        onSave={handleSaveReports}
      />
    ) : (
      <TeamUserModalProfileTab
        actualMode={actualMode}
        user={user}
        companyName={companyName}
        access={access}
        accessError={accessError}
        pointsAccess={pointsAccess}
        pointsAccessError={pointsAccessError}
        password={password}
        resetPassword={resetPassword}
        form={form}
        onFormChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
        onRoleChange={(role) =>
          setForm((prev) => ({
            ...prev,
            role,
            permissions: (userDefaultPermissionsByRole[role] ?? []).slice(),
          }))
        }
        formatDateTime={fmtDt}
      />
    )

  return (
    <>
      {user ? (
        <TeamUserCloneModal
          open={isCloneOpen}
          onClose={() => setIsCloneOpen(false)}
          targetUserId={user.id}
          onCloned={async () => {
            if (!onCloned) return
            await onCloned(user.id)
          }}
        />
      ) : null}
      <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Участник</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {isLoading ? (
          <div className={styles.loadingWrap}>
            <PageLoader centered size="lg" />
          </div>
        ) : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {canRender ? (
          <div className={styles.content}>
            <Nav appearance="tabs" activeKey={tab} onSelect={(k) => setTab((k as typeof tab) ?? 'profile')}>
              <Nav.Item eventKey="profile">Профиль</Nav.Item>
              <Nav.Item eventKey="role">Роль</Nav.Item>
              <Nav.Item eventKey="distribution">Распределение</Nav.Item>
              <Nav.Item eventKey="reports">Отчёты</Nav.Item>
            </Nav>

            <div className={styles.contentGrid}>
            <div className={styles.left}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
              <div className={styles.roleBadge}>{userRoleLabel(user.role)}</div>
            </div>

            <div className={styles.right}>
              {tabContent}
            </div>
            </div>
            
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footerActions}>
          {actualMode === 'view' ? (
            <>
              {user && canEdit ? (
                <IconButton label="Изменить" onClick={() => onModeChange('edit')} disabled={isLoading}>
                  <Image src="/icons/edit.svg" alt="" width={16} height={16} aria-hidden="true" />
                </IconButton>
              ) : null}
              {user && canEdit ? (
                <IconButton label="Клонировать" onClick={() => setIsCloneOpen(true)} disabled={isLoading}>
                  <Image src="/icons/copy.svg" alt="" width={16} height={16} aria-hidden="true" />
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
                      groupIds: form.groupIds ?? [],
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
    </>
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
