'use client'

import { useEffect, useMemo, useState } from 'react'
import { DatePicker, Input, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { ProjectsResponse, ProjectItem } from '@/pages-fsd/projects/model/types'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import styles from './PriceMonitoringPage.module.css'
import { AttemptDetailsModal } from './AttemptDetailsModal'

type StatsResponse = {
  totalAttempts: number
  uniqueRespondents: number
  uniqueShops: number
  byDay: Array<{ day: string; count: number }>
  topRegions: Array<{ label: string; count: number }>
  topCities: Array<{ label: string; count: number }>
  topShopBrands: Array<{ label: string; count: number }>
}

type AttemptsResponse = {
  items: Array<{
    id: string
    submittedAt: string | null
    createdAt: string
    mode: string | null
    project: { id: string; name: string }
    survey: { id: string; title: string }
    purpose: string | null
    respondent: { auditorId: string | null; name: string | null; phone: string | null; email: string | null }
    regionCode: string | null
    city: string | null
    shopBrandName: string | null
    shopAddressLabel: string | null
    productGroup: string | null
    productBrand: string | null
    productSkuLabel: string | null
  }>
  total: number
  limit: number
  offset: number
}

type TabKey = 'dashboard' | 'attempts'

function toIsoDate (d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function fmtDt (value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`
}

export function PriceMonitoringPage () {
  const [tab, setTab] = useState<TabKey>('dashboard')

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [isProjectsLoading, setIsProjectsLoading] = useState(true)

  const [projectId, setProjectId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)

  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(false)

  const [attempts, setAttempts] = useState<AttemptsResponse | null>(null)
  const [attemptsError, setAttemptsError] = useState<string | null>(null)
  const [isAttemptsLoading, setIsAttemptsLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)

  const limit = 50

  const projectOptions = useMemo(() => {
    return [
      { value: null as unknown as string, label: 'Все проекты' },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ]
  }, [projects])

  async function loadProjects () {
    setIsProjectsLoading(true)
    setProjectsError(null)
    try {
      const res = await axiosMainRequest.get<ProjectsResponse>(apiRoutes.projects.projects)
      setProjects(res.data.items ?? [])
    } catch (err: unknown) {
      setProjects([])
      setProjectsError(getApiErrorMessage(err))
    } finally {
      setIsProjectsLoading(false)
    }
  }

  async function loadStats () {
    setIsStatsLoading(true)
    setStatsError(null)
    try {
      const params: Record<string, string> = {}
      if (projectId) params.projectId = projectId
      if (dateFrom) params.dateFrom = toIsoDate(dateFrom)
      if (dateTo) params.dateTo = toIsoDate(dateTo)
      const res = await axiosMainRequest.get<StatsResponse>(apiRoutes.priceMonitoring.stats, { params })
      setStats(res.data)
    } catch (err: unknown) {
      setStats(null)
      setStatsError(getApiErrorMessage(err))
    } finally {
      setIsStatsLoading(false)
    }
  }

  async function loadAttempts (opts?: { offset?: number }) {
    const nextOffset = opts?.offset ?? offset
    setIsAttemptsLoading(true)
    setAttemptsError(null)
    try {
      const params: Record<string, string | number> = { limit, offset: nextOffset }
      if (projectId) params.projectId = projectId
      if (dateFrom) params.dateFrom = toIsoDate(dateFrom)
      if (dateTo) params.dateTo = toIsoDate(dateTo)
      const query = q.trim()
      if (query) params.q = query
      const res = await axiosMainRequest.get<AttemptsResponse>(apiRoutes.priceMonitoring.attempts, { params })
      setAttempts(res.data)
      setOffset(nextOffset)
    } catch (err: unknown) {
      setAttempts(null)
      setAttemptsError(getApiErrorMessage(err))
    } finally {
      setIsAttemptsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tab === 'dashboard') {
      loadStats()
      return
    }
    setOffset(0)
    loadAttempts({ offset: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, projectId, dateFrom, dateTo])

  useEffect(() => {
    if (tab !== 'attempts') return
    const t = window.setTimeout(() => {
      setOffset(0)
      loadAttempts({ offset: 0 })
    }, 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tab])

  const total = attempts?.total ?? 0
  const canPrev = offset > 0
  const canNext = offset + limit < total
  const fromN = total ? offset + 1 : 0
  const toN = Math.min(offset + limit, total)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Ценовой мониторинг</div>
        <div className={styles.subtitle}>Статистика и список прохождений анкеты ценового мониторинга</div>
      </div>

      <div className={styles.tabs}>
        <TabButton isActive={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
          Дашборд
        </TabButton>
        <TabButton isActive={tab === 'attempts'} onClick={() => setTab('attempts')}>
          Прохождения
        </TabButton>
      </div>

      <div className={styles.card}>
        <div className={styles.filters}>
          <SelectPicker
            value={projectId}
            onChange={(v) => setProjectId((v as string | null) ?? null)}
            data={projectOptions}
            cleanable
            searchable
            placeholder="Проект"
            style={{ minWidth: 320 }}
            disabled={isProjectsLoading}
          />
          <DatePicker
            oneTap
            value={dateFrom}
            onChange={(v) => setDateFrom(v ?? null)}
            placeholder="Дата от"
            format="dd.MM.yyyy"
            style={{ minWidth: 170 }}
          />
          <DatePicker
            oneTap
            value={dateTo}
            onChange={(v) => setDateTo(v ?? null)}
            placeholder="до"
            format="dd.MM.yyyy"
            style={{ minWidth: 150 }}
          />

          {tab === 'attempts' ? (
            <Input
              value={q}
              onChange={(v) => setQ(String(v ?? ''))}
              placeholder="Поиск по ФИО / телефону / почте…"
              style={{ flex: 1, minWidth: 260 }}
            />
          ) : null}

          <Button
            type="button"
            variant="secondary"
            disabled={isProjectsLoading || (tab === 'dashboard' ? isStatsLoading : isAttemptsLoading)}
            onClick={() => (tab === 'dashboard' ? loadStats() : loadAttempts({ offset }))}
          >
            Обновить
          </Button>
        </div>

        {projectsError ? <div className={styles.error} style={{ marginTop: 10 }}>{projectsError}</div> : null}
      </div>

      {tab === 'dashboard' ? (
        <>
          {isStatsLoading ? <div className={styles.hint}>Загрузка статистики…</div> : null}
          {statsError ? <div className={styles.error}>{statsError}</div> : null}

          {stats ? (
            <>
              <div className={styles.kpis}>
                <div className={styles.kpi}>
                  <div className={styles.kpiTitle}>Прохождений</div>
                  <div className={styles.kpiValue}>{stats.totalAttempts}</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiTitle}>Уникальных респондентов</div>
                  <div className={styles.kpiValue}>{stats.uniqueRespondents}</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiTitle}>Уникальных точек</div>
                  <div className={styles.kpiValue}>{stats.uniqueShops}</div>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.card}>
                  <div className={styles.sectionTitle}>Динамика по дням</div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table} style={{ minWidth: 520 }}>
                      <thead>
                        <tr>
                          <th className={styles.th}>День</th>
                          <th className={styles.th}>Прохождений</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byDay.map((x) => (
                          <tr key={x.day}>
                            <td className={styles.td}><span className={styles.mono}>{x.day}</span></td>
                            <td className={styles.td}>{x.count}</td>
                          </tr>
                        ))}
                        {stats.byDay.length === 0 ? (
                          <tr>
                            <td className={styles.td} colSpan={2}>Нет данных</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.sectionTitle}>Топ регионов / городов</div>
                  <div className={styles.grid2}>
                    <div>
                      <div className={styles.hint} style={{ marginBottom: 8 }}>Регионы</div>
                      {stats.topRegions.map((x) => (
                        <div key={`r-${x.label}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                          <span className={styles.mono}>{x.label}</span>
                          <span>{x.count}</span>
                        </div>
                      ))}
                      {stats.topRegions.length === 0 ? <div className={styles.hint}>Нет данных</div> : null}
                    </div>
                    <div>
                      <div className={styles.hint} style={{ marginBottom: 8 }}>Города</div>
                      {stats.topCities.map((x) => (
                        <div key={`c-${x.label}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                          <span>{x.label}</span>
                          <span>{x.count}</span>
                        </div>
                      ))}
                      {stats.topCities.length === 0 ? <div className={styles.hint}>Нет данных</div> : null}
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div className={styles.hint} style={{ marginBottom: 8 }}>Топ сетей</div>
                    {stats.topShopBrands.map((x) => (
                      <div key={`b-${x.label}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                        <span>{x.label}</span>
                        <span>{x.count}</span>
                      </div>
                    ))}
                    {stats.topShopBrands.length === 0 ? <div className={styles.hint}>Нет данных</div> : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          {isAttemptsLoading ? <div className={styles.hint}>Загрузка прохождений…</div> : null}
          {attemptsError ? <div className={styles.error}>{attemptsError}</div> : null}

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Список прохождений</div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Когда</th>
                    <th className={styles.th}>Проект</th>
                    <th className={styles.th}>Респондент</th>
                    <th className={styles.th}>Локация / магазин</th>
                    <th className={styles.th}>Товар</th>
                    <th className={styles.th}>Тип ссылки</th>
                    <th className={styles.th} style={{ width: 72 }} />
                  </tr>
                </thead>
                <tbody>
                  {(attempts?.items ?? []).map((a) => (
                    <tr key={a.id}>
                      <td className={styles.td}>
                        <div>{fmtDt(a.submittedAt)}</div>
                        <div className={styles.mono} title={a.id}>{a.id.slice(0, 8)}…</div>
                      </td>
                      <td className={styles.td}>
                        <div>{a.project.name}</div>
                        <div className={styles.hint}>{a.survey.title}</div>
                      </td>
                      <td className={styles.td}>
                        <div>{a.respondent.name ?? '—'}</div>
                        <div className={styles.mono}>{a.respondent.phone ?? '—'}</div>
                        <div className={styles.mono}>{a.respondent.email ?? '—'}</div>
                      </td>
                      <td className={styles.td}>
                        <div>{a.city ? `${a.city}${a.regionCode ? ` (${a.regionCode})` : ''}` : (a.regionCode ?? '—')}</div>
                        <div className={styles.hint}>{a.shopBrandName ?? '—'}</div>
                        <div className={styles.hint}>{a.shopAddressLabel ?? '—'}</div>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.hint}>{a.productGroup ?? '—'}</div>
                        <div className={styles.hint}>{a.productBrand ?? '—'}</div>
                        <div>{a.productSkuLabel ?? '—'}</div>
                      </td>
                      <td className={styles.td}>
                        <div>{a.purpose ?? '—'}</div>
                        <div className={styles.hint}>{a.mode ?? '—'}</div>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            aria-label="Детали"
                            title="Детали"
                            onClick={() => setSelectedAttemptId(a.id)}
                          >
                            <EyeIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {attempts && attempts.items.length === 0 && !isAttemptsLoading ? (
                    <tr>
                      <td className={styles.td} colSpan={7}>Пока нет прохождений</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className={styles.paginationRow}>
              <div className={styles.paginationInfo}>
                Показано {fromN}–{toN} из {total}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button type="button" variant="ghost" disabled={!canPrev || isAttemptsLoading} onClick={() => loadAttempts({ offset: Math.max(0, offset - limit) })}>
                  Назад
                </Button>
                <Button type="button" variant="ghost" disabled={!canNext || isAttemptsLoading} onClick={() => loadAttempts({ offset: offset + limit })}>
                  Далее
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <AttemptDetailsModal open={Boolean(selectedAttemptId)} attemptId={selectedAttemptId} onClose={() => setSelectedAttemptId(null)} />
    </div>
  )
}

function TabButton ({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`.trim()}
      aria-pressed={isActive}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function EyeIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

