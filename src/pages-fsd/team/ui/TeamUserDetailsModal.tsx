'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckPicker, Checkbox, Input, Modal, Nav, SelectPicker } from 'rsuite'
import Image from 'next/image'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { userRoleLabel } from '@/entities/user'
import { userRoleOptions, type UserRole } from '@/entities/user'
import { Button } from '@/shared/ui'
import type { ShopPointItem, ShopPointsResponse } from '@/pages-fsd/project/model/types'
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
} from '../model/types'

import styles from './TeamUserDetailsModal.module.css'
import { TeamUserCloneModal } from './TeamUserCloneModal'

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

function uniq (arr: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of arr) {
    const v = String(x || '').trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

const REPORTS: Array<{ key: string; label: string }> = [
  { key: 'checks.summary', label: 'Сводка по проверкам' },
  { key: 'checks.by-region', label: 'Проверки по регионам' },
  { key: 'appeals.summary', label: 'Апелляции' },
  { key: 'auditors.activity', label: 'Активность аудиторов' },
  { key: 'media.usage', label: 'Медиа (фото/видео)' },
  { key: 'exports.history', label: 'История выгрузок' },
]

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
      groupIds: string[]
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
    if (!open || !uid || !canEdit) {
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
  }, [open, user?.id, canEdit])

  useEffect(() => {
    const uid = user?.id
    if (!open || !uid || !canEdit) {
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
        setCompaniesError(err instanceof Error ? err.message : 'Не удалось загрузить клиентов')
      })
    return () => {
      isAlive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, canEdit])

  useEffect(() => {
    const uid = user?.id
    const cid = activeDistributionCompanyId
    if (!open || !uid || !cid || !canEdit) {
      setDist(null)
      setFilterOptions({})
      setDistError(null)
      return
    }
    let isAlive = true
    setDistError(null)
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
  }, [open, user?.id, activeDistributionCompanyId, canEdit])

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
    if (!open || !uid || !cid || !canEdit) {
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
  }, [open, user?.id, reportsCompanyId, canEdit])

  useEffect(() => {
    const uid = user?.id
    const cid = activeDistributionCompanyId
    if (!open || !uid || !cid || !canEdit || actualMode !== 'edit') {
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
  }, [actualMode, canEdit, companiesAccess?.items, open, pointsQ, pointsRegion, user?.id, activeDistributionCompanyId])

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
    <>
      {user ? (
        <TeamUserCloneModal
          open={isCloneOpen}
          onClose={() => setIsCloneOpen(false)}
          targetUserId={user.id}
        />
      ) : null}
      <Modal open={open} onClose={onClose} size="md">
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

            <div className={styles.contentGrid}>
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

                    <div className={styles.row}>
                      <div className={styles.label}>Пользовательские группы</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {groupsError ? <div className={styles.error}>{groupsError}</div> : null}
                        {!allGroups.length && !groupsError ? <div className={styles.value}>—</div> : null}
                        {allGroups.map((g) => {
                          const checked = form.groupIds.includes(g.id)
                          return (
                            <Checkbox
                              key={g.id}
                              checked={checked}
                              onChange={(_, next) => {
                                setForm((prev) => {
                                  const set = new Set(prev.groupIds)
                                  if (next) set.add(g.id)
                                  else set.delete(g.id)
                                  return { ...prev, groupIds: [...set] }
                                })
                              }}
                            >
                              {g.name}
                            </Checkbox>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              ) : tab === 'distribution' ? (
                <div className={styles.grid}>
                  {companiesError ? <div className={styles.error}>{companiesError}</div> : null}
                  {distError ? <div className={styles.error}>{distError}</div> : null}

                  <FieldEdit label="Клиент">
                    <SelectPicker
                      value={activeDistributionCompanyId}
                      onChange={(v) => setActiveDistributionCompanyId((v as string | null) ?? null)}
                      data={(companiesAccess?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
                      cleanable={false}
                      searchable
                      block
                      disabled={!companiesAccess?.items?.length}
                    />
                  </FieldEdit>

                  <div className={styles.row}>
                    <div className={styles.label}>Доступ к клиенту</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <Checkbox
                        checked={Boolean(
                          (companiesAccess?.items ?? []).find((c) => c.id === activeDistributionCompanyId)?.hasAccess,
                        )}
                        disabled={!activeDistributionCompanyId || !companiesAccess}
                        onChange={(_, next) => {
                          if (!user?.id || !companiesAccess || !activeDistributionCompanyId) return
                          const cid = activeDistributionCompanyId
                          const prev = companiesAccess.items ?? []
                          const nextIds = new Set(prev.filter((x) => x.hasAccess).map((x) => x.id))
                          if (next) nextIds.add(cid)
                          else nextIds.delete(cid)
                          const payload: ReplaceUserCompaniesAccessRequest = { companyIds: [...nextIds] }
                          axiosMainRequest
                            .put<UserCompaniesAccessResponse>(apiRoutes.team.userCompaniesAccess(user.id), payload)
                            .then((res) => setCompaniesAccess(res.data))
                            .catch(() => null)
                        }}
                      >
                        Разрешить доступ
                      </Checkbox>
                      <div className={styles.hint}>
                        Если доступ выключен — пользователь не сможет переключиться на этого клиента в селекторе.
                      </div>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.label}>Характеристики точки</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {(Object.keys(filterOptions) || []).length ? (
                        Object.entries(filterOptions).map(([key, values]) => (
                          <div key={key} style={{ display: 'grid', gap: 6 }}>
                            <div className={styles.hint}>{filterTitles[key] ? `${filterTitles[key]} (${key})` : key}</div>
                            <CheckPicker
                              data={(values ?? []).map((v) => ({ value: v, label: v }))}
                              value={distDraft.filterValues?.[key] ?? []}
                              onChange={(v) => {
                                setDistDraft((prev) => ({
                                  ...prev,
                                  filterValues: { ...(prev.filterValues ?? {}), [key]: uniq((v as string[]) ?? []) },
                                }))
                              }}
                              block
                              disabled={actualMode !== 'edit'}
                              placeholder="Выберите значения…"
                            />
                          </div>
                        ))
                      ) : (
                        <div className={styles.hint}>Фильтры не настроены или АП не загружена</div>
                      )}
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.label}>Локации</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Input
                          value={pointsQ}
                          onChange={(v) => setPointsQ(String(v ?? ''))}
                          placeholder="Поиск по коду/адресу…"
                          disabled={actualMode !== 'edit'}
                        />
                        <SelectPicker
                          value={pointsRegion}
                          onChange={(v) => setPointsRegion((v as string | null) ?? null)}
                          data={(filterOptions.region ?? []).map((v) => ({ value: v, label: v }))}
                          placeholder="Регион…"
                          searchable
                          block
                          disabled={actualMode !== 'edit' || !(filterOptions.region ?? []).length}
                          cleanable
                          style={{ minWidth: 220 }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={actualMode !== 'edit' || pointsLoading || !points.length}
                          onClick={() => {
                            setDistDraft((prev) => ({ ...prev, pointIds: uniq([...(prev.pointIds ?? []), ...points.map((p) => p.id)]) }))
                          }}
                        >
                          Выбрать видимые
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={actualMode !== 'edit' || pointsLoading || !points.length}
                          onClick={() => {
                            const visible = new Set(points.map((p) => p.id))
                            setDistDraft((prev) => ({ ...prev, pointIds: (prev.pointIds ?? []).filter((id) => !visible.has(id)) }))
                          }}
                        >
                          Снять видимые
                        </Button>
                      </div>

                      {pointsLoading ? <div className={styles.hint}>Загрузка точек…</div> : null}
                      <div className={styles.hint}>Выбрано точек: {distDraft.pointIds?.length ?? 0}</div>

                      <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: 8 }}>
                        {points.map((p) => {
                          const checked = (distDraft.pointIds ?? []).includes(p.id)
                          return (
                            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 2px' }}>
                              <Checkbox
                                checked={checked}
                                disabled={actualMode !== 'edit'}
                                onChange={(_, next) => {
                                  setDistDraft((prev) => {
                                    const set = new Set(prev.pointIds ?? [])
                                    if (next) set.add(p.id)
                                    else set.delete(p.id)
                                    return { ...prev, pointIds: [...set] }
                                  })
                                }}
                              />
                              <div style={{ display: 'grid', gap: 2 }}>
                                <div style={{ fontWeight: 500 }}>{p.code}{p.pointName ? ` · ${p.pointName}` : ''}</div>
                                <div className={styles.hint}>{[p.regionCode && `рег. ${p.regionCode}`, p.cityName, p.address].filter(Boolean).join(' · ') || '—'}</div>
                              </div>
                            </div>
                          )
                        })}
                        {!points.length && !pointsLoading ? <div className={styles.hint}>Точек не найдено</div> : null}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <Button
                      type="button"
                      variant="primary"
                      disabled={actualMode !== 'edit' || !user?.id || !activeDistributionCompanyId || isDistSaving}
                      onClick={() => {
                        if (!user?.id || !activeDistributionCompanyId) return
                        setIsDistSaving(true)
                        setDistError(null)
                        const payload: ReplaceUserCompanyDistributionRequest = {
                          filterValues: distDraft.filterValues ?? {},
                          pointIds: distDraft.pointIds ?? [],
                        }
                        axiosMainRequest
                          .put<UserCompanyDistributionResponse>(apiRoutes.team.userCompanyDistribution(user.id, activeDistributionCompanyId), payload)
                          .then((res) => setDist(res.data))
                          .catch((err: unknown) => setDistError(err instanceof Error ? err.message : 'Не удалось сохранить'))
                          .finally(() => setIsDistSaving(false))
                      }}
                    >
                      {isDistSaving ? 'Сохранение…' : 'Сохранить распределение'}
                    </Button>
                  </div>
                </div>
              ) : tab !== 'profile' ? (
                <div className={styles.grid}>
                  {tab === 'reports' ? (
                    <div className={styles.grid}>
                      {reportsError ? <div className={styles.error}>{reportsError}</div> : null}
                      <FieldEdit label="Клиент">
                        <SelectPicker
                          value={reportsCompanyId}
                          onChange={(v) => setReportsCompanyId((v as string | null) ?? null)}
                          data={(companiesAccess?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
                          cleanable={false}
                          searchable
                          block
                          disabled={!companiesAccess?.items?.length}
                        />
                      </FieldEdit>

                      <div className={styles.row}>
                        <div className={styles.label}>Доступные отчёты</div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {REPORTS.map((r) => {
                            const checked = (reportsDraft.reportKeys ?? []).includes(r.key)
                            return (
                              <Checkbox
                                key={r.key}
                                checked={checked}
                                disabled={actualMode !== 'edit'}
                                onChange={(_, next) => {
                                  setReportsDraft((prev) => {
                                    const set = new Set(prev.reportKeys ?? [])
                                    if (next) set.add(r.key)
                                    else set.delete(r.key)
                                    return { ...prev, reportKeys: [...set] }
                                  })
                                }}
                              >
                                {r.label}
                              </Checkbox>
                            )
                          })}
                          <div className={styles.hint}>Выбрано: {reportsDraft.reportKeys?.length ?? 0}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <Button
                          type="button"
                          variant="primary"
                          disabled={actualMode !== 'edit' || !user?.id || !reportsCompanyId || isReportsSaving}
                          onClick={() => {
                            if (!user?.id || !reportsCompanyId) return
                            setIsReportsSaving(true)
                            setReportsError(null)
                            const payload: ReplaceUserCompanyReportsRequest = { reportKeys: reportsDraft.reportKeys ?? [] }
                            axiosMainRequest
                              .put<UserCompanyReportsResponse>(apiRoutes.team.userCompanyReports(user.id, reportsCompanyId), payload)
                              .then((res) => {
                                setReports(res.data)
                                setReportsDraft({ reportKeys: res.data.reportKeys ?? [] })
                              })
                              .catch((err: unknown) => setReportsError(err instanceof Error ? err.message : 'Не удалось сохранить'))
                              .finally(() => setIsReportsSaving(false))
                          }}
                        >
                          {isReportsSaving ? 'Сохранение…' : 'Сохранить'}
                        </Button>
                      </div>

                      {reports?.reportKeys?.length ? <div className={styles.hint}>Сохранено ключей: {reports.reportKeys.length}</div> : null}
                    </div>
                  ) : null}
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

