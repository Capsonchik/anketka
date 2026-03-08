'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import styles from './PriceMonitoringPage.module.css'

type SurveyQuestionOptionItem = { id: string; label: string; value: string; sortOrder: number }
type SurveyQuestionItem = {
  id: string
  type: string
  title: string
  required: boolean
  sortOrder: number
  config: Record<string, unknown> | null
  options: SurveyQuestionOptionItem[]
}
type SurveyPageItem = { id: string; title: string; sortOrder: number; questions: SurveyQuestionItem[] }

type AttemptDetailsResponse = {
  attempt: {
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
  }
  builder: { surveyId: string; pages: SurveyPageItem[] }
  storedAnswers: Record<string, unknown>
}

function getConfigString (cfg: Record<string, unknown> | null, key: string): string | null {
  if (!cfg) return null
  const v = cfg[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function getCode (q: SurveyQuestionItem): string | null {
  return getConfigString(q.config, 'code')
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

function fmtValue (value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—'
  if (typeof value === 'string') {
    const s = value.trim()
    return s ? s : '—'
  }
  try {
    return JSON.stringify(value)
  } catch {
    return '—'
  }
}

function normalizeStored (stored: Record<string, unknown>): { mode: string | null; screening: Record<string, unknown>; product: Record<string, unknown>; flat: Record<string, unknown> } {
  const mode = typeof stored.mode === 'string' ? stored.mode : null
  const answersAny = stored.answers

  if (answersAny && typeof answersAny === 'object' && !Array.isArray(answersAny)) {
    const answers = answersAny as Record<string, unknown>
    const screening = (answers.screening && typeof answers.screening === 'object' && !Array.isArray(answers.screening)) ? (answers.screening as Record<string, unknown>) : {}
    const product = (answers.product && typeof answers.product === 'object' && !Array.isArray(answers.product)) ? (answers.product as Record<string, unknown>) : {}
    if (Object.keys(screening).length || Object.keys(product).length) {
      return { mode, screening, product, flat: answers }
    }
    return { mode, screening: {}, product: {}, flat: answers }
  }

  return { mode, screening: {}, product: {}, flat: stored }
}

export function AttemptDetailsModal ({
  attemptId,
  open,
  onClose,
}: {
  attemptId: string | null
  open: boolean
  onClose: () => void
}) {
  const [data, setData] = useState<AttemptDetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !attemptId) return
    let isAlive = true
    setIsLoading(true)
    setError(null)
    setData(null)
    ;(async () => {
      try {
        const res = await axiosMainRequest.get<AttemptDetailsResponse>(apiRoutes.priceMonitoring.attempt(attemptId))
        if (!isAlive) return
        setData(res.data)
      } catch (err: unknown) {
        if (!isAlive) return
        setError(getApiErrorMessage(err))
      } finally {
        if (!isAlive) return
        setIsLoading(false)
      }
    })()
    return () => {
      isAlive = false
    }
  }, [attemptId, open])

  const pages = useMemo(() => data?.builder?.pages ?? [], [data])
  const norm = useMemo(() => normalizeStored(data?.storedAnswers ?? {}), [data])

  const attempt = data?.attempt ?? null

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Детали прохождения</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {!isLoading && !error && !data ? <div className={styles.hint}>Нет данных</div> : null}

        {attempt ? (
          <>
            <div className={styles.card} style={{ padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                <div>
                  <div><b>Проект:</b> {attempt.project.name}</div>
                  <div><b>Анкета:</b> {attempt.survey.title}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><b>Когда:</b> {fmtDt(attempt.submittedAt)}</div>
                  <div className={styles.mono} title={attempt.id}>{attempt.id}</div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                <div><b>Респондент:</b> {attempt.respondent.name ?? '—'}</div>
                <div className={styles.mono}>{attempt.respondent.phone ?? '—'} · {attempt.respondent.email ?? '—'}</div>
                <div><b>Ссылка:</b> {attempt.purpose ?? '—'}{attempt.mode ? ` · ${attempt.mode}` : ''}</div>
              </div>
            </div>

            {pages.map((p) => {
              const isScreening = p.title === 'Скрининг'
              const isProduct = p.title === 'Анкета'
              const src = isScreening && Object.keys(norm.screening).length ? norm.screening : isProduct && Object.keys(norm.product).length ? norm.product : norm.flat

              return (
                <div key={p.id} className={styles.card} style={{ marginBottom: 12 }}>
                  <div className={styles.sectionTitle}>{p.title}</div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table} style={{ minWidth: 720 }}>
                      <thead>
                        <tr>
                          <th className={styles.th}>Вопрос</th>
                          <th className={styles.th}>Ответ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.questions
                          .filter((q) => q.type !== 'intro')
                          .map((q) => {
                            const code = getCode(q)
                            if (!code) return null
                            const raw = src[code]

                            let shown: string
                            if (code === 'shopBrand') shown = attempt.shopBrandName ?? fmtValue(raw)
                            else if (code === 'shopAddress') shown = attempt.shopAddressLabel ?? fmtValue(raw)
                            else if (code === 'productSku') shown = attempt.productSkuLabel ?? fmtValue(raw)
                            else shown = fmtValue(raw)

                            return (
                              <tr key={q.id}>
                                <td className={styles.td}>
                                  <div>{q.title}</div>
                                  <div className={styles.hint}>{code}{q.required ? ' · *' : ''}</div>
                                </td>
                                <td className={styles.td}>{shown}</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

