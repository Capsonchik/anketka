'use client'

import { useEffect, useState } from 'react'
import { Checkbox, Input, Modal, SelectPicker } from 'rsuite'

import type { SurveyQuestionItem, SurveyQuestionOptionItem, SurveyQuestionUpdateRequest } from '@/entities/survey'
import { Button } from '@/shared/ui'

import styles from './SurveyQuestionEditorModal.module.css'

const QUESTION_TYPES = [
  { value: 'short_text', label: 'Короткий текст' },
  { value: 'long_text', label: 'Длинный текст' },
  { value: 'number', label: 'Число' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Телефон' },
  { value: 'date', label: 'Дата' },
  { value: 'time', label: 'Время' },
  { value: 'single_choice', label: 'Одиночный выбор' },
  { value: 'multi_choice', label: 'Множественный выбор' },
  { value: 'scale', label: 'Шкала' },
  { value: 'matrix', label: 'Табличный' },
  { value: 'photo', label: 'Фото' },
  { value: 'rank', label: 'Ранг' },
  { value: 'boolean', label: 'Да/Нет' },
]

export type SurveyQuestionEditorModalProps = {
  open: boolean
  question: SurveyQuestionItem | null
  pageTitle: string
  onClose: () => void
  onSave: (payload: SurveyQuestionUpdateRequest) => Promise<void>
}

export function SurveyQuestionEditorModal ({
  open,
  question,
  pageTitle,
  onClose,
  onSave,
}: SurveyQuestionEditorModalProps) {
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [required, setRequired] = useState(false)
  const [sortOrder, setSortOrder] = useState('')
  const [weight, setWeight] = useState('')
  const [allowNa, setAllowNa] = useState(false)
  const [allowComment, setAllowComment] = useState(false)
  const [dynamicTitleTemplate, setDynamicTitleTemplate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (question) {
      setTitle(question.title)
      setCode(question.code ?? '')
      setDescription(question.description ?? '')
      setRequired(Boolean(question.required))
      setSortOrder(String(question.sortOrder ?? ''))
      setWeight(String(question.weight ?? ''))
      setAllowNa(Boolean(question.allowNa))
      setAllowComment(Boolean(question.allowComment))
      setDynamicTitleTemplate(question.dynamicTitleTemplate ?? '')
    }
  }, [question])

  async function handleSave () {
    if (!question) return
    setError(null)
    const t = title.trim()
    if (!t) {
      setError('Введите формулировку вопроса')
      return
    }
    setIsSaving(true)
    try {
      const payload: SurveyQuestionUpdateRequest = {
        title: t,
        required,
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
        weight: weight.trim() ? Number(weight) : undefined,
        allowNa,
        allowComment,
        dynamicTitleTemplate: dynamicTitleTemplate.trim() || undefined,
      }
      await onSave(payload)
      onClose()
    } catch (err: unknown) {
      setError(String(err))
    } finally {
      setIsSaving(false)
    }
  }

  if (!question) return null

  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Редактировать вопрос</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.hint}>
          {question.type} · {pageTitle}
        </div>

        <div className={styles.fields}>
          <Field label="Формулировка вопроса *">
            <Input value={title} onChange={(v) => setTitle(String(v ?? ''))} placeholder="Текст вопроса" />
          </Field>

          <Field label="Код вопроса">
            <Input value={code} onChange={(v) => setCode(String(v ?? ''))} placeholder="Например: Q1" />
          </Field>

          <Field label="Описание">
            <Input value={description} onChange={(v) => setDescription(String(v ?? ''))} placeholder="Подсказка или пояснение" />
          </Field>

          <Field label="Порядок">
            <Input value={sortOrder} onChange={(v) => setSortOrder(String(v ?? ''))} placeholder="0" />
          </Field>

          <Field label="Вес вопроса (баллы)">
            <Input value={weight} onChange={(v) => setWeight(String(v ?? ''))} placeholder="0" type="number" />
          </Field>

          <Field label="Динамическая формулировка">
            <Input
              value={dynamicTitleTemplate}
              onChange={(v) => setDynamicTitleTemplate(String(v ?? ''))}
              placeholder="{{product.name}} или {{q:123: ответ}}"
            />
          </Field>

          <div className={styles.checkboxes}>
            <Checkbox checked={required} onChange={(_, checked) => setRequired(Boolean(checked))}>
              Обязательный вопрос
            </Checkbox>
            <Checkbox checked={allowNa} onChange={(_, checked) => setAllowNa(Boolean(checked))}>
              Разрешить ответ NA (не применимо)
            </Checkbox>
            <Checkbox checked={allowComment} onChange={(_, checked) => setAllowComment(Boolean(checked))}>
              Разрешить комментарий
            </Checkbox>
          </div>
        </div>

        {(question.type === 'single_choice' || question.type === 'multi_choice') && question.options.length > 0 && (
          <div className={styles.optionsSection}>
            <div className={styles.optionsTitle}>Варианты ответа (баллы, NA, исключающий)</div>
            <div className={styles.optionsList}>
              {question.options.map((opt) => (
                <OptionRow key={opt.id} option={opt} />
              ))}
            </div>
          </div>
        )}

        {error ? <div className={styles.error}>{error}</div> : null}
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
          Закрыть
        </Button>
        <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving}>
          Сохранить
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function Field ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  )
}

function OptionRow ({ option }: { option: SurveyQuestionOptionItem }) {
  return (
    <div className={styles.optionRow}>
      <span className={styles.optionLabel}>{option.label}</span>
      {option.points != null && option.points !== 0 && <span className={styles.optionPoints}>{option.points} б.</span>}
      {option.isNA && <span className={styles.optionNa}>NA</span>}
      {option.isExclusive && <span className={styles.optionExcl}>искл.</span>}
    </div>
  )
}
