import { useEffect, useMemo, useState } from 'react'
import { DatePicker, Input, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { AuditorGender, AuditorItem, AuditorsResponse } from '@/entities/auditor'
import type { ProjectSurveysResponse, SurveyItem } from '@/entities/survey'
import type { UserRole } from '@/entities/user'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../../lib/getApiErrorMessage'
import styles from '../ProjectPage.module.css'

type AssignedByItem = { id: string; firstName: string; lastName: string; email: string }
type AssignedItem = {
  auditor: AuditorItem
  assignedAt: string
  assignedBy: AssignedByItem | null
  status: string
  acceptedAt: string | null
  declinedAt: string | null
  inProgressAt: string | null
}
type AssignedResponse = { items: AssignedItem[] }

function toIsoDate (d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatName (a: AuditorItem): string {
  return [a.lastName, a.firstName, a.middleName].filter(Boolean).join(' ')
}

function genderLabel (gender: AuditorGender | null | undefined): string {
  if (gender === 'male') return 'м'
  if (gender === 'female') return 'ж'
  return '—'
}

function assignmentStatusLabel (s: string): string {
  if (s === 'assigned') return 'Назначена'
  if (s === 'accepted') return 'Принята'
  if (s === 'declined') return 'Отклонена'
  if (s === 'in_progress') return 'В работе'
  return s || '—'
}

export function ProjectAssignmentsTab ({ projectId }: { projectId: string }) {
  const [myRole, setMyRole] = useState<UserRole | null>(null)

  const [surveys, setSurveys] = useState<SurveyItem[]>([])
  const [surveysError, setSurveysError] = useState<string | null>(null)
  const [isSurveysLoading, setIsSurveysLoading] = useState(true)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)

  const [auditors, setAuditors] = useState<AuditorItem[]>([])
  const [auditorsError, setAuditorsError] = useState<string | null>(null)
  const [isAuditorsLoading, setIsAuditorsLoading] = useState(false)

  const [assigned, setAssigned] = useState<AuditorItem[]>([])
  const [assignedError, setAssignedError] = useState<string | null>(null)
  const [isAssignedLoading, setIsAssignedLoading] = useState(false)
  const [assignedByByAuditorId, setAssignedByByAuditorId] = useState<Record<string, AssignedByItem | null>>({})
  const [statusByAuditorId, setStatusByAuditorId] = useState<Record<string, string>>({})

  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [gender, setGender] = useState<AuditorGender | 'all'>('all')
  const [birthDateFrom, setBirthDateFrom] = useState<Date | null>(null)
  const [birthDateTo, setBirthDateTo] = useState<Date | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isMutating, setIsMutating] = useState(false)

  const isAdmin = myRole === 'admin'

  useEffect(() => {
    let isAlive = true
    ;(async () => {
      try {
        const me = await axiosMainRequest.get<{ role: UserRole }>(apiRoutes.users.me)
        if (!isAlive) return
        setMyRole(me.data.role)
      } catch {
        if (!isAlive) return
        setMyRole(null)
      }
    })()
    return () => {
      isAlive = false
    }
  }, [])

  async function loadSurveys () {
    setIsSurveysLoading(true)
    setSurveysError(null)
    try {
      const res = await axiosMainRequest.get<ProjectSurveysResponse>(apiRoutes.projects.projectSurveys(projectId))
      const items = res.data.items ?? []
      setSurveys(items)
      setSelectedSurveyId((prev) => prev ?? (items[0]?.id ?? null))
    } catch (err: unknown) {
      setSurveys([])
      setSurveysError(getApiErrorMessage(err))
    } finally {
      setIsSurveysLoading(false)
    }
  }

  async function loadAssigned (surveyId: string) {
    setIsAssignedLoading(true)
    setAssignedError(null)
    try {
      const res = await axiosMainRequest.get<AssignedResponse>(apiRoutes.projects.projectSurveyAuditors(projectId, surveyId))
      const items = res.data.items ?? []
      setAssigned(items.map((x) => x.auditor))
      const byId: Record<string, AssignedByItem | null> = {}
      const statusById: Record<string, string> = {}
      for (const x of items) {
        byId[x.auditor.id] = x.assignedBy ?? null
        statusById[x.auditor.id] = x.status ?? 'assigned'
      }
      setAssignedByByAuditorId(byId)
      setStatusByAuditorId(statusById)
    } catch (err: unknown) {
      setAssigned([])
      setAssignedError(getApiErrorMessage(err))
      setAssignedByByAuditorId({})
      setStatusByAuditorId({})
    } finally {
      setIsAssignedLoading(false)
    }
  }

  async function loadAuditors () {
    setIsAuditorsLoading(true)
    setAuditorsError(null)
    try {
      const params: Record<string, string> = {}
      const query = q.trim()
      const cityValue = city.trim()
      if (query) params.q = query
      if (cityValue) params.city = cityValue
      if (gender !== 'all') params.gender = gender
      if (birthDateFrom) params.birthDateFrom = toIsoDate(birthDateFrom)
      if (birthDateTo) params.birthDateTo = toIsoDate(birthDateTo)

      const res = await axiosMainRequest.get<AuditorsResponse>(apiRoutes.auditors.auditors, { params })
      setAuditors(res.data.items ?? [])
      // сохраняем выбор только тем, кто виден в списке — так проще UX
      setSelected((prev) => {
        const visible = new Set((res.data.items ?? []).map((a) => a.id))
        const next = new Set<string>()
        for (const id of prev) {
          if (visible.has(id)) next.add(id)
        }
        return next
      })
    } catch (err: unknown) {
      setAuditors([])
      setAuditorsError(getApiErrorMessage(err))
    } finally {
      setIsAuditorsLoading(false)
    }
  }

  useEffect(() => {
    loadSurveys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (!selectedSurveyId) return
    loadAssigned(selectedSurveyId)
    loadAuditors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurveyId])

  useEffect(() => {
    if (!selectedSurveyId) return
    const t = window.setTimeout(() => {
      loadAuditors()
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, gender, birthDateFrom, birthDateTo, selectedSurveyId])

  const surveyOptions = useMemo(() => {
    return surveys.map((s) => ({ value: s.id, label: `${formatSurveyCategory(s.category)} · ${s.title}` }))
  }, [surveys])

  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.id)), [assigned])

  const selectedIds = useMemo(() => Array.from(selected), [selected])
  const selectedCount = selectedIds.length

  async function assignSelected () {
    if (!isAdmin) return
    if (!selectedSurveyId) return
    if (!selectedCount) return
    setIsMutating(true)
    try {
      await axiosMainRequest.post(apiRoutes.projects.projectSurveyAuditors(projectId, selectedSurveyId), {
        auditorIds: selectedIds,
      })
      await loadAssigned(selectedSurveyId)
      setSelected(new Set())
    } catch (err: unknown) {
      setAssignedError(getApiErrorMessage(err))
    } finally {
      setIsMutating(false)
    }
  }

  async function unassign (auditorId: string) {
    if (!isAdmin) return
    if (!selectedSurveyId) return
    setIsMutating(true)
    try {
      await axiosMainRequest.delete(apiRoutes.projects.projectSurveyAuditor(projectId, selectedSurveyId, auditorId))
      await loadAssigned(selectedSurveyId)
    } catch (err: unknown) {
      setAssignedError(getApiErrorMessage(err))
    } finally {
      setIsMutating(false)
    }
  }

  async function unassignAll () {
    if (!isAdmin) return
    if (!selectedSurveyId) return
    const ok = window.confirm('Снять все назначения для выбранной анкеты?')
    if (!ok) return
    setIsMutating(true)
    try {
      await axiosMainRequest.delete(apiRoutes.projects.projectSurveyAuditors(projectId, selectedSurveyId))
      await loadAssigned(selectedSurveyId)
    } catch (err: unknown) {
      setAssignedError(getApiErrorMessage(err))
    } finally {
      setIsMutating(false)
    }
  }

  async function copyAuditorLink (auditorId: string) {
    if (!selectedSurveyId) return
    try {
      const res = await axiosMainRequest.post<{ invite: { token: string } }>(
        apiRoutes.projects.projectSurveyAuditorInvite(projectId, selectedSurveyId, auditorId),
      )
      const token = res.data?.invite?.token
      if (!token) return
      const url = `${window.location.origin}/pa?token=${encodeURIComponent(token)}`
      await navigator.clipboard.writeText(url)
    } catch (err: unknown) {
      setAssignedError(getApiErrorMessage(err))
    }
  }

  function toggleAllVisible () {
    setSelected((prev) => {
      const visibleIds = auditors.map((a) => a.id)
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }

  const isEmpty = !isSurveysLoading && !surveysError && surveys.length === 0

  return (
    <div className={styles.tabPanel}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Назначения</div>
          <div className={styles.formRow}>
            <SelectPicker
              value={selectedSurveyId}
              onChange={(v) => setSelectedSurveyId((v as string | null) ?? null)}
              cleanable={false}
              searchable={false}
              data={surveyOptions}
              placeholder="Выберите анкету"
              style={{ minWidth: 320 }}
              disabled={isSurveysLoading || surveys.length === 0}
            />
            <Button type="button" variant="secondary" onClick={loadSurveys} disabled={isSurveysLoading}>
              Обновить
            </Button>
          </div>
        </div>

        {isSurveysLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {surveysError ? <div className={styles.error}>{surveysError}</div> : null}
        {isEmpty ? <div className={styles.hint}>Сначала прикрепите анкету к проекту</div> : null}

        {selectedSurveyId ? (
          <>
            <div className={styles.hint}>
              Выберите аудиторов по фильтрам и назначьте их на анкету проекта. Назначения привязаны к связке проект+анкета.
            </div>

            <div className={styles.formRow} style={{ marginTop: 10 }}>
              <Input
                value={q}
                onChange={(v) => setQ(String(v ?? ''))}
                placeholder="Поиск по ФИО / телефону / почте…"
                style={{ flex: 1, minWidth: 240 }}
              />
              <Input
                value={city}
                onChange={(v) => setCity(String(v ?? ''))}
                placeholder="Город…"
                style={{ minWidth: 220 }}
              />
              <SelectPicker
                value={gender}
                onChange={(v) => setGender((v as AuditorGender | 'all') ?? 'all')}
                cleanable={false}
                searchable={false}
                data={[
                  { label: 'Пол: любой', value: 'all' },
                  { label: 'Мужской', value: 'male' },
                  { label: 'Женский', value: 'female' },
                ]}
                style={{ minWidth: 180 }}
              />
              <DatePicker
                oneTap
                value={birthDateFrom}
                onChange={(v) => setBirthDateFrom(v ?? null)}
                placeholder="Дата рождения от"
                format="dd.MM.yyyy"
                style={{ minWidth: 180 }}
              />
              <DatePicker
                oneTap
                value={birthDateTo}
                onChange={(v) => setBirthDateTo(v ?? null)}
                placeholder="до"
                format="dd.MM.yyyy"
                style={{ minWidth: 160 }}
              />
            </div>

            <div className={styles.formRow} style={{ marginTop: 10 }}>
              <Button type="button" variant="ghost" onClick={toggleAllVisible} disabled={!auditors.length}>
                Выбрать/снять всё
              </Button>
              <Button type="button" variant="primary" disabled={!isAdmin || isMutating || selectedCount === 0} onClick={assignSelected}>
                Назначить выбранных{selectedCount ? ` (${selectedCount})` : ''}
              </Button>
              <Button type="button" variant="ghost" disabled={!isAdmin || isMutating || assigned.length === 0} onClick={unassignAll}>
                Снять все назначения{assigned.length ? ` (${assigned.length})` : ''}
              </Button>
              {!isAdmin ? <div className={styles.hint}>Назначения доступны только администратору</div> : null}
            </div>

            {isAssignedLoading ? <div className={styles.hint}>Загрузка назначений…</div> : null}
            {assignedError ? <div className={styles.error}>{assignedError}</div> : null}

            {isAuditorsLoading ? <div className={styles.hint}>Загрузка аудиторов…</div> : null}
            {auditorsError ? <div className={styles.error}>{auditorsError}</div> : null}

            <div className={styles.tableWrap}>
              <table className={styles.table} style={{ minWidth: 980 }}>
                <thead>
                  <tr>
                    <th className={styles.th} style={{ width: 44 }}>
                      <input
                        type="checkbox"
                        aria-label="Выбрать всё"
                        checked={auditors.length > 0 && auditors.every((a) => selected.has(a.id))}
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th className={styles.th}>ФИО</th>
                    <th className={styles.th}>Контакты</th>
                    <th className={styles.th}>Город</th>
                    <th className={styles.th}>Дата рождения</th>
                    <th className={styles.th}>Пол</th>
                    <th className={styles.th}>Статус</th>
                    <th className={styles.th}>Назначил</th>
                    <th className={styles.th} style={{ width: 150 }} />
                  </tr>
                </thead>
                <tbody>
                  {auditors.map((a) => {
                    const isAssigned = assignedIds.has(a.id)
                    const assignedBy = assignedByByAuditorId[a.id] ?? null
                    const status = statusByAuditorId[a.id] ?? 'assigned'
                    return (
                      <tr key={a.id}>
                        <td className={styles.td}>
                          <input
                            type="checkbox"
                            aria-label="Выбрать аудитора"
                            checked={selected.has(a.id)}
                            onChange={() =>
                              setSelected((prev) => {
                                const next = new Set(prev)
                                if (next.has(a.id)) next.delete(a.id)
                                else next.add(a.id)
                                return next
                              })
                            }
                          />
                        </td>
                        <td className={styles.tdWrap}>
                          {formatName(a)}
                          {isAssigned ? <span className={styles.badge} style={{ marginLeft: 8 }}>назначен</span> : null}
                        </td>
                        <td className={styles.tdWrap}>
                          <div>{a.phone ?? '—'}</div>
                          <div>{a.email ?? '—'}</div>
                        </td>
                        <td className={styles.td}>{a.city}</td>
                        <td className={styles.td}>{a.birthDate ? String(a.birthDate).slice(0, 10) : '—'}</td>
                        <td className={styles.td}>{genderLabel(a.gender)}</td>
                        <td className={styles.td}>{isAssigned ? assignmentStatusLabel(status) : '—'}</td>
                        <td className={styles.td}>
                          {isAssigned && assignedBy ? (
                            <span title={assignedBy.email}>{assignedBy.lastName} {assignedBy.firstName}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={styles.td}>
                          {isAssigned ? (
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={styles.iconButton}
                                aria-label="Скопировать ссылку"
                                title="Скопировать ссылку"
                                disabled={!isAdmin || isMutating || status === 'declined'}
                                onClick={() => copyAuditorLink(a.id)}
                              >
                                <LinkIcon />
                              </button>
                              <button
                                type="button"
                                className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                                aria-label="Снять назначение"
                                title="Снять назначение"
                                disabled={!isAdmin || isMutating}
                                onClick={() => unassign(a.id)}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {auditors.length === 0 && !isAuditorsLoading ? (
                    <tr>
                      <td className={styles.td} colSpan={9}>Аудиторы не найдены</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}

function formatSurveyCategory (category: SurveyItem['category']) {
  if (category === 'mystery') return 'Мистери'
  return 'Ценовой мониторинг'
}

function LinkIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6m-8 4h10m-9 0 .7 14h6.6L16 7M10 11v7m4-7v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

