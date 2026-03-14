'use client'

import { useCallback, useState } from 'react'
import { Input, Modal } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { SurveyBuilderResponse, SurveyPageItem, SurveyQuestionItem } from '@/entities/survey'
import { Button } from '@/shared/ui'

import styles from './SurveySimulatorPanel.module.css'

export type SurveySimulatorPanelProps = {
  surveyId: string
  builder: SurveyBuilderResponse
  open: boolean
  onClose: () => void
}

type SimulateResponse = {
  valid: boolean
  errors: Record<string, string>
  scoreTotal?: number
  scoreMax?: number
  scorePercent?: number
  scoreBreakdown?: { byQuestion?: Record<string, { score: number; max: number }> }
}

export function SurveySimulatorPanel ({ surveyId, builder, open, onClose }: SurveySimulatorPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [result, setResult] = useState<SimulateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSimulate = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await axiosMainRequest.post<SimulateResponse>(apiRoutes.surveys.surveySimulate(surveyId), { answers })
      setResult(res.data)
    } catch (err: unknown) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }, [surveyId, answers])

  function getQuestionCode (q: SurveyQuestionItem): string {
    return q.code?.trim() || q.id
  }

  function updateAnswer (code: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [code]: value }))
    setResult(null)
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Симуляция прохождения</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.hint}>
          Введите ответы и нажмите «Рассчитать баллы» для preview скоринга.
        </div>

        <div className={styles.sections}>
          {builder.pages.map((page) => (
            <SimulatorSection
              key={page.id}
              page={page}
              answers={answers}
              onUpdate={updateAnswer}
              getCode={getQuestionCode}
            />
          ))}
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        {result && (
          <div className={styles.result}>
            <div className={styles.resultTitle}>Результат скоринга</div>
            <div className={styles.resultRow}>
              <span>Набрано:</span>
              <strong>{result.scoreTotal ?? 0} / {result.scoreMax ?? 0} баллов</strong>
            </div>
            <div className={styles.resultRow}>
              <span>Процент:</span>
              <strong>{result.scorePercent ?? 0}%</strong>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
        <Button type="button" variant="primary" onClick={runSimulate} disabled={isLoading}>
          {isLoading ? 'Расчёт...' : 'Рассчитать баллы'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function SimulatorSection ({
  page,
  answers,
  onUpdate,
  getCode,
}: {
  page: SurveyPageItem
  answers: Record<string, string | string[]>
  onUpdate: (code: string, value: string | string[]) => void
  getCode: (q: SurveyQuestionItem) => string
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        {page.title}
        {page.sectionType === 'loop' && <span className={styles.loopBadge}>Цикл</span>}
      </div>
      <div className={styles.questions}>
        {page.questions.map((q) => (
          <SimulatorQuestion
            key={q.id}
            question={q}
            value={answers[getCode(q)]}
            onChange={(v) => onUpdate(getCode(q), v)}
            getCode={getCode}
          />
        ))}
      </div>
    </div>
  )
}

function SimulatorQuestion ({
  question,
  value,
  onChange,
  getCode,
}: {
  question: SurveyQuestionItem
  value: string | string[] | undefined
  onChange: (v: string | string[]) => void
  getCode: (q: SurveyQuestionItem) => string
}) {
  const type = question.type

  if (type === 'intro') return null

  if (type === 'single_choice' || type === 'select') {
    const opts = question.options.map((o) => ({ value: o.value, label: o.label }))
    return (
      <div className={styles.question}>
        <label className={styles.label}>{question.title}</label>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={styles.select}
        >
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    )
  }

  if (type === 'multi_choice') {
    const arr = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
    const set = new Set(arr)
    return (
      <div className={styles.question}>
        <div className={styles.label}>{question.title}</div>
        <div className={styles.checkboxGroup}>
          {question.options.map((o) => (
            <label key={o.value} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={set.has(o.value)}
                onChange={(e) => {
                  const next = new Set(set)
                  if (e.target.checked) next.add(o.value)
                  else next.delete(o.value)
                  onChange(Array.from(next))
                }}
              />
              {o.label}
              {o.points != null && o.points > 0 && <span className={styles.optMeta}> ({o.points} б.)</span>}
              {o.isNA && <span className={styles.optNa}> NA</span>}
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.question}>
      <label className={styles.label}>{question.title}</label>
      <Input
        value={typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : ''}
        onChange={(v) => onChange(String(v ?? ''))}
        placeholder={type}
      />
    </div>
  )
}
