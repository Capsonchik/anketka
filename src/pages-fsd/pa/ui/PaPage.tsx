'use client'

import { useEffect, useMemo, useState } from 'react'
import { Checkbox, DatePicker, Input, SelectPicker } from 'rsuite'
import { useSearchParams } from 'next/navigation'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import styles from './PaPage.module.css'

type PublicPaResponse = {
  token: string
  purpose: string
  project: { id: string; name: string }
  survey: { id: string; title: string; category: string; templateKey: string | null }
  builder: { surveyId: string; pages: SurveyPageItem[] }
}

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

type OptionsResponse = { items: Array<{ value: string; label: string }> }

type ApiErrorLike = {
  response?: { data?: { detail?: unknown } }
  message?: unknown
}

function getErrMessage (err: unknown): string {
  const e = err as ApiErrorLike
  const detail = e?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (typeof e?.message === 'string' && e.message.trim()) return e.message
  return 'Ошибка'
}

function getConfigString (cfg: Record<string, unknown> | null, key: string): string | null {
  if (!cfg) return null
  const v = cfg[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function getCode (q: SurveyQuestionItem): string | null {
  return getConfigString(q.config, 'code')
}

function isAuditorIdentityCode (code: string): boolean {
  return code === 'auditorName' || code === 'auditorPhone' || code === 'auditorEmail'
}

function toIsoDateTime (d: Date): string {
  return d.toISOString()
}

function toIsoDate (d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function PaPage () {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token'), [searchParams])

  const [data, setData] = useState<PublicPaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [pageIdx, setPageIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [submittedCount, setSubmittedCount] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const [optionsByCode, setOptionsByCode] = useState<Record<string, Array<{ value: string; label: string }>>>({})
  const [optionsKeyByCode, setOptionsKeyByCode] = useState<Record<string, string>>({})
  const [optionsLoadingCode, setOptionsLoadingCode] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  const pages = useMemo(() => data?.builder?.pages ?? [], [data])
  const page = pages[pageIdx] ?? null

  const screeningPageIdx = useMemo(() => {
    const idx = pages.findIndex((p) => p.title === 'Скрининг')
    return idx >= 0 ? idx : 0
  }, [pages])

  const repeatPageIdx = useMemo(() => {
    const idx = pages.findIndex((p) => p.title === 'Анкета')
    return idx >= 0 ? idx : null
  }, [pages])

  const isRepeatPage = repeatPageIdx !== null && pageIdx === repeatPageIdx

  const screeningCodes = useMemo(() => {
    const p = pages[screeningPageIdx]
    if (!p) return []
    const out: string[] = []
    for (const q of p.questions) {
      const code = getCode(q)
      if (code) out.push(code)
    }
    return out
  }, [pages, screeningPageIdx])

  const repeatCodes = useMemo(() => {
    if (repeatPageIdx === null) return []
    const p = pages[repeatPageIdx]
    if (!p) return []
    const out: string[] = []
    for (const q of p.questions) {
      const code = getCode(q)
      if (code) out.push(code)
    }
    return out
  }, [pages, repeatPageIdx])

  const requiredByCode = useMemo(() => {
    const map: Record<string, { title: string; type: string; pageTitle: string }> = {}
    for (const p of pages) {
      for (const q of p.questions) {
        if (!q.required) continue
        if (q.type === 'intro') continue
        const code = getCode(q)
        if (!code) continue
        map[code] = { title: q.title, type: q.type, pageTitle: p.title }
      }
    }
    return map
  }, [pages])

  function isFilledRequired (type: string, value: unknown): boolean {
    if (type === 'boolean') return value === true
    if (type === 'number' || type === 'money') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'datetime' || type === 'date') return typeof value === 'string' && value.trim().length > 0
    return typeof value === 'string' && value.trim().length > 0
  }

  const missingRequiredForPage = useMemo(() => {
    if (!page) return []
    const out: Array<{ code: string; title: string; type: string }> = []
    for (const q of page.questions) {
      if (!q.required) continue
      if (q.type === 'intro') continue
      const code = getCode(q)
      if (!code) continue
      if (isAuditorIdentityCode(code)) continue
      if (!isFilledRequired(q.type, answers[code])) {
        out.push({ code, title: q.title, type: q.type })
      }
    }
    return out
  }, [answers, page])

  const missingRequiredForRepeat = useMemo(() => {
    if (repeatPageIdx === null) return []
    const p = pages[repeatPageIdx]
    if (!p) return []
    const out: Array<{ code: string; title: string; type: string }> = []
    for (const q of p.questions) {
      if (!q.required) continue
      if (q.type === 'intro') continue
      const code = getCode(q)
      if (!code) continue
      if (isAuditorIdentityCode(code)) continue
      if (!isFilledRequired(q.type, answers[code])) {
        out.push({ code, title: q.title, type: q.type })
      }
    }
    return out
  }, [answers, pages, repeatPageIdx])

  async function load () {
    if (!token) {
      setError('Не передан token')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await axiosMainRequest.get<PublicPaResponse>(apiRoutes.public.pa(token))
      setData(res.data)
      setPageIdx(0)
      setSubmittedCount(0)
      setIsFinished(false)
      setValidationError(null)
    } catch (err: unknown) {
      setError(getErrMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function ensureOptions (q: SurveyQuestionItem) {
    const code = getCode(q)
    if (!token || !code) return
    const source = getConfigString(q.config, 'source')
    if (!source) return

    setOptionsError(null)
    setOptionsLoadingCode(code)
    try {
      const params: Record<string, string> = { source }
      // depends: region/city/shopBrand/productGroup/productBrand
      if (typeof answers.region === 'string') params.region = answers.region
      if (typeof answers.city === 'string') params.city = answers.city
      if (typeof answers.shopBrand === 'string') params.shopBrand = answers.shopBrand
      if (typeof answers.productGroup === 'string') params.productGroup = answers.productGroup
      if (typeof answers.productBrand === 'string') params.productBrand = answers.productBrand

      const key = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      if (optionsKeyByCode[code] === key && optionsByCode[code]) {
        return
      }

      const res = await axiosMainRequest.get<OptionsResponse>(apiRoutes.public.paOptions(token), { params })
      setOptionsByCode((prev) => ({ ...prev, [code]: res.data.items ?? [] }))
      setOptionsKeyByCode((prev) => ({ ...prev, [code]: key }))
    } catch (err: unknown) {
      setOptionsError(getErrMessage(err))
    } finally {
      setOptionsLoadingCode(null)
    }
  }

  async function submit (mode?: 'continue' | 'finish') {
    if (!token) return
    try {
      if (isRepeatPage) {
        if (missingRequiredForRepeat.length) {
          setValidationError(`Заполните обязательные поля: ${missingRequiredForRepeat.map((x) => x.title).join(', ')}`)
          return
        }
        setValidationError(null)

        const screening: Record<string, unknown> = {}
        const product: Record<string, unknown> = {}
        for (const code of screeningCodes) {
          screening[code] = answers[code]
        }
        for (const code of repeatCodes) {
          product[code] = answers[code]
        }
        await axiosMainRequest.post(`${apiRoutes.public.pa(token)}/submit`, { mode: mode ?? 'finish', answers: { screening, product } })

        if (mode === 'continue') {
          setSubmittedCount((x) => x + 1)
          setAnswers((prev) => {
            const next = { ...prev }
            for (const code of repeatCodes) {
              delete next[code]
            }
            return next
          })
          return
        }

        setIsFinished(true)
        return
      }

      if (missingRequiredForPage.length) {
        setValidationError(`Заполните обязательные поля: ${missingRequiredForPage.map((x) => x.title).join(', ')}`)
        return
      }
      setValidationError(null)

      await axiosMainRequest.post(`${apiRoutes.public.pa(token)}/submit`, { mode: mode ?? 'finish', answers })
      setIsFinished(true)
    } catch (err: unknown) {
      window.alert(getErrMessage(err))
    }
  }

  if (isLoading) return <div className={styles.hint}>Загрузка…</div>
  if (error) return <div className={styles.error}>{error}</div>
  if (!data) return <div className={styles.hint}>Нет данных</div>
  if (isFinished) return <div className={styles.hint}>Спасибо, анкета отправлена.</div>

  const canPrev = pageIdx > 0
  const canNext = pageIdx < pages.length - 1
  const canGoNext = canNext && missingRequiredForPage.length === 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="titleH1">{data.survey.title}</h1>
        <div className={styles.subtitle}>{data.project.name}</div>
      </div>

      {page ? (
        <section className={styles.card}>
          <div className={styles.pageTitle}>{page.title}</div>

          {optionsError ? <div className={styles.error}>{optionsError}</div> : null}
          {validationError ? <div className={styles.error}>{validationError}</div> : null}

          {page.questions
            .filter((q) => {
              const code = getCode(q)
              return !(code && isAuditorIdentityCode(code))
            })
            .map((q) => (
            <Question
              key={q.id}
              q={q}
              valueByCode={answers}
              onChange={(code, value) => setAnswers((prev) => ({ ...prev, [code]: value }))}
              options={optionsByCode[getCode(q) || ''] ?? []}
              isOptionsLoading={optionsLoadingCode === (getCode(q) || '')}
              onNeedOptions={() => ensureOptions(q)}
            />
          ))}

          <div className={styles.navRow}>
            <Button type="button" variant="ghost" disabled={!canPrev} onClick={() => setPageIdx((x) => Math.max(0, x - 1))}>
              Назад
            </Button>

            {isRepeatPage ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={() => submit('continue')}>
                  Отправить и продолжить{submittedCount ? ` (${submittedCount})` : ''}
                </Button>
                <Button type="button" variant="primary" onClick={() => submit('finish')}>
                  Отправить и завершить
                </Button>
              </div>
            ) : canNext ? (
              <Button
                type="button"
                variant="primary"
                disabled={!canGoNext}
                onClick={() => {
                  if (missingRequiredForPage.length) {
                    setValidationError(`Заполните обязательные поля: ${missingRequiredForPage.map((x) => x.title).join(', ')}`)
                    return
                  }
                  setValidationError(null)
                  setPageIdx((x) => Math.min(pages.length - 1, x + 1))
                }}
              >
                Далее
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={() => submit('finish')}>
                Отправить
              </Button>
            )}
          </div>
        </section>
      ) : (
        <div className={styles.hint}>Страница не найдена</div>
      )}
    </div>
  )
}

function Question ({
  q,
  valueByCode,
  onChange,
  options,
  isOptionsLoading,
  onNeedOptions,
}: {
  q: SurveyQuestionItem
  valueByCode: Record<string, unknown>
  onChange: (code: string, value: unknown) => void
  options: Array<{ value: string; label: string }>
  isOptionsLoading: boolean
  onNeedOptions: () => void
}) {
  const code = getCode(q)
  if (!code) return null

  const type = q.type
  const val = valueByCode[code]

  if (type === 'intro') {
    const text = getConfigString(q.config, 'text')
    return (
      <div>
        <div className={styles.questionTitle}>{q.title}</div>
        {typeof text === 'string' ? <div className={styles.introText}>{text}</div> : null}
      </div>
    )
  }

  if (type === 'boolean') {
    return (
      <div>
        <div className={styles.questionTitle}>{q.title}</div>
        <Checkbox checked={Boolean(val)} onChange={(_, checked) => onChange(code, Boolean(checked))}>
          Да
        </Checkbox>
      </div>
    )
  }

  if (type === 'datetime') {
    const d = typeof val === 'string' ? new Date(val) : null
    return (
      <div>
        <div className={styles.questionTitle}>{q.title}</div>
        <DatePicker
          oneTap
          value={d && !Number.isNaN(d.getTime()) ? d : null}
          onChange={(v) => onChange(code, v ? toIsoDateTime(v) : null)}
          format="dd.MM.yyyy HH:mm"
          block
        />
      </div>
    )
  }

  if (type === 'select') {
    return (
      <div>
        <div className={styles.questionTitle}>{q.title}</div>
        <SelectPicker
          value={typeof val === 'string' ? val : null}
          onChange={(v) => onChange(code, (v as string | null) ?? null)}
          data={options}
          placeholder={isOptionsLoading ? 'Загрузка…' : 'Выберите…'}
          cleanable
          block
          onOpen={onNeedOptions}
        />
      </div>
    )
  }

  if (type === 'number' || type === 'money') {
    return (
      <div>
        <div className={styles.questionTitle}>{q.title}</div>
        <Input
          value={typeof val === 'number' || typeof val === 'string' ? String(val) : ''}
          onChange={(v) => {
            const s = String(v ?? '').trim()
            onChange(code, s ? Number(s.replace(',', '.')) : null)
          }}
          placeholder={type === 'money' ? '0.00' : '0'}
        />
      </div>
    )
  }

  if (type === 'email' || type === 'phone' || type === 'text') {
    return (
      <div>
        <div className={styles.questionTitle}>{q.title}</div>
        <Input value={typeof val === 'string' ? val : ''} onChange={(v) => onChange(code, String(v ?? ''))} />
      </div>
    )
  }

  if (type === 'date') {
    const d = typeof val === 'string' ? new Date(val) : null
    return (
      <div>
        <div className={styles.questionTitle}>{q.title}</div>
        <DatePicker
          oneTap
          value={d && !Number.isNaN(d.getTime()) ? d : null}
          onChange={(v) => onChange(code, v ? toIsoDate(v) : null)}
          format="dd.MM.yyyy"
          block
        />
      </div>
    )
  }

  return (
    <div>
      <div className={styles.questionTitle}>{q.title}</div>
      <div className={styles.questionHint}>Тип «{q.type}» пока не поддержан</div>
    </div>
  )
}

