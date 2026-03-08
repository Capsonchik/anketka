'use client'

import { useEffect, useMemo, useState } from 'react'

import axiosAuditorRequest from '@/api-config/auditor-api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { clearAuditorAuthTokens } from '@/api-config/auditor-auth-tokens'
import { Button } from '@/shared/ui'

import styles from './AuditorPortal.module.css'

type AssignmentItem = {
  projectId: string
  projectName: string
  surveyId: string
  surveyTitle: string
  status: string
  assignedAt: string
  acceptedAt: string | null
  declinedAt: string | null
  inProgressAt: string | null
  inviteToken: string
}

type AssignmentsResponse = { items: AssignmentItem[] }

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

function statusLabel (s: string): string {
  if (s === 'assigned') return 'Назначена'
  if (s === 'accepted') return 'Принята'
  if (s === 'declined') return 'Отклонена'
  if (s === 'in_progress') return 'В работе'
  return s
}

export function AuditorAssignmentsPage () {
  const [items, setItems] = useState<AssignmentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  async function load () {
    setIsLoading(true)
    setError(null)
    try {
      const res = await axiosAuditorRequest.get<AssignmentsResponse>(apiRoutes.auditor.assignments)
      setItems(res.data.items ?? [])
    } catch (err: unknown) {
      setItems([])
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasItems = useMemo(() => items.length > 0, [items.length])

  async function setStatus (a: AssignmentItem, status: 'accepted' | 'declined') {
    setIsMutating(true)
    try {
      await axiosAuditorRequest.post(apiRoutes.auditor.assignmentStatus(a.projectId, a.surveyId), { status })
      await load()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsMutating(false)
    }
  }

  function openSurvey (a: AssignmentItem) {
    const url = `${window.location.origin}/pa?token=${encodeURIComponent(a.inviteToken)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.page} style={{ placeItems: 'start center' }}>
      <div className={styles.card} style={{ maxWidth: 980 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div className={styles.title}>Мои проверки</div>
            <div className={styles.subtitle}>Список назначенных анкет. Статус “В работе” появится после первой отправки товара.</div>
          </div>

          <div className={styles.rowActions}>
            <Button type="button" variant="secondary" disabled={isLoading} onClick={load}>
              Обновить
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                clearAuditorAuthTokens()
                window.location.replace('/auditor/login')
              }}
            >
              Выйти
            </Button>
          </div>
        </div>

        {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {!isLoading && !error && !hasItems ? <div className={styles.hint}>Пока нет назначенных проверок</div> : null}

        {hasItems ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Проект</th>
                  <th className={styles.th}>Анкета</th>
                  <th className={styles.th}>Статус</th>
                  <th className={styles.th}>Назначена</th>
                  <th className={styles.th}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={`${a.projectId}:${a.surveyId}`}>
                    <td className={styles.td}>{a.projectName}</td>
                    <td className={styles.td}>{a.surveyTitle}</td>
                    <td className={styles.td}>
                      <span className={styles.badge}>{statusLabel(a.status)}</span>
                      {a.inProgressAt ? <div className={styles.hint}>с {fmtDt(a.inProgressAt)}</div> : null}
                    </td>
                    <td className={styles.td}>{fmtDt(a.assignedAt)}</td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <Button type="button" variant="secondary" disabled={isMutating || a.status === 'declined'} onClick={() => openSurvey(a)}>
                          Открыть анкету
                        </Button>
                        <Button type="button" variant="primary" disabled={isMutating || a.status === 'declined'} onClick={() => setStatus(a, 'accepted')}>
                          Принять
                        </Button>
                        <Button type="button" variant="ghost" disabled={isMutating || a.status === 'in_progress'} onClick={() => setStatus(a, 'declined')}>
                          Отклонить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}

