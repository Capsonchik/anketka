'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input, Modal, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type {
  SurveyApplyTemplateRequest,
  SurveyBuilderResponse,
  SurveyCategory,
  SurveyAttachedProjectsResponse,
  SurveyItem,
  SurveyPageItem,
  SurveyQuestionItem,
  SurveyQuestionUpdateRequest,
  SurveyResponse,
} from '@/entities/survey'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import { SurveyQuestionEditorModal } from './SurveyQuestionEditorModal'
import { SurveySectionList } from './SurveySectionList'
import { SurveySimulatorPanel } from './SurveySimulatorPanel'
import styles from './SurveyPage.module.css'

type TemplateKey = 'price_monitoring_full' | 'price_monitoring_quick'

const templates: Array<{
  key: TemplateKey
  title: string
  description: string
  steps: string[]
  highlights: string[]
}> = [
  {
    key: 'price_monitoring_full',
    title: 'Ценовой мониторинг · Полный',
    description: '2 страницы: Скрининг (магазин/аудитор/фото/старт) → Анкета (товары из чек-листа).',
    steps: [
      'Скрининг: дата начала, регион/город, бренд/адрес, ФИО/телефон/почта, фото',
      'Анкета: группа/бренд/номенклатура, цены, фейсы, запас, фото, комментарии',
    ],
    highlights: [
      'Подходит для аудита “как по регламенту”',
      'Есть дата/время старта проверки + данные аудитора',
      'Есть фото магазина и фото по товару',
    ],
  },
  {
    key: 'price_monitoring_quick',
    title: 'Ценовой мониторинг · Быстрый',
    description: 'Минимальный набор полей, чтобы быстро собрать цены и наличие.',
    steps: [
      'Выбор магазина из адресной программы проекта',
      'Мониторинг цен по товарам из чек-листа проекта',
    ],
    highlights: [
      'Минимум полей — быстрее проход',
      'Фокус на ценах/наличии',
      'Подходит для частых повторных обходов',
    ],
  },
]

export function SurveyPage ({ surveyId }: { surveyId: string }) {
  const searchParams = useSearchParams()
  const projectIdFromQuery = useMemo(() => searchParams.get('projectId'), [searchParams])

  const [survey, setSurvey] = useState<SurveyItem | null>(null)
  const [builder, setBuilder] = useState<SurveyBuilderResponse | null>(null)
  const [attachedProjects, setAttachedProjects] = useState<Array<{ id: string; name: string; attachedAt: string }>>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>('price_monitoring_full')
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const [editQuestion, setEditQuestion] = useState<{ q: SurveyQuestionItem; pageTitle: string } | null>(null)
  const [questionError, setQuestionError] = useState<string | null>(null)

  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [addSectionTitle, setAddSectionTitle] = useState('')
  const [addSectionType, setAddSectionType] = useState<'regular' | 'loop'>('regular')
  const [isAddingSection, setIsAddingSection] = useState(false)

  const [addQuestionOpen, setAddQuestionOpen] = useState(false)
  const [addQuestionPageId, setAddQuestionPageId] = useState<string>('')
  const [addQuestionTitle, setAddQuestionTitle] = useState('')
  const [addQuestionType, setAddQuestionType] = useState('short_text')
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)

  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const [analytics, setAnalytics] = useState<{
    totalAttempts: number
    completedAttempts: number
    avgScorePercent: number | null
    scoreDistribution: Array<{ bucket: string; count: number }>
  } | null>(null)

  const templateKey = (survey?.templateKey ?? null) as string | null

  const shouldPickTemplate = survey?.category === 'price_monitoring' && !templateKey && (builder?.pages?.length ?? 0) === 0

  const categoryLabel = useMemo(() => formatCategory(survey?.category ?? null), [survey?.category])

  const canEdit = (survey?.status ?? 'created') !== 'published'

  async function copyTestLink () {
    if (!projectIdFromQuery) return
    try {
      const res = await axiosMainRequest.post<{ invite: { token: string } }>(
        apiRoutes.projects.projectSurveyTestInvite(projectIdFromQuery, surveyId),
      )
      const token = res.data?.invite?.token
      if (!token) return
      const url = `${window.location.origin}/pa?token=${encodeURIComponent(token)}`
      await navigator.clipboard.writeText(url)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    }
  }

  async function loadSurvey () {
    const res = await axiosMainRequest.get<SurveyResponse>(apiRoutes.surveys.survey(surveyId))
    setSurvey(res.data?.survey ?? null)
  }

  async function loadAttachedProjects () {
    try {
      const res = await axiosMainRequest.get<SurveyAttachedProjectsResponse>(apiRoutes.surveys.surveyProjects(surveyId))
      setAttachedProjects(res.data.items ?? [])
    } catch {
      setAttachedProjects([])
    }
  }

  async function loadBuilder () {
    const res = await axiosMainRequest.get<SurveyBuilderResponse>(apiRoutes.surveys.surveyBuilder(surveyId))
    setBuilder(res.data ?? null)
  }

  async function loadAll () {
    setIsLoading(true)
    setError(null)
    try {
      await loadSurvey()
      await loadBuilder()
      await loadAttachedProjects()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAnalytics () {
    try {
      const res = await axiosMainRequest.get<{
        totalAttempts: number
        completedAttempts: number
        avgScorePercent: number | null
        scoreDistribution: Array<{ bucket: string; count: number }>
      }>(apiRoutes.surveys.surveyAnalytics(surveyId))
      setAnalytics(res.data)
    } catch {
      setAnalytics(null)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId])

  useEffect(() => {
    if (!survey) return
    if (shouldPickTemplate) {
      setBuilder(null)
      return
    }
    loadBuilder().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey?.id, survey?.templateKey])

  async function applyTemplate () {
    setApplyError(null)
    setIsApplying(true)
    try {
      const payload: SurveyApplyTemplateRequest = { templateKey: selectedTemplateKey }
      await axiosMainRequest.post(apiRoutes.surveys.surveyApplyTemplate(surveyId), payload)
      await loadAll()
    } catch (err: unknown) {
      setApplyError(getApiErrorMessage(err))
    } finally {
      setIsApplying(false)
    }
  }

  const questionsById = useMemo(() => {
    const map = new Map<string, { pageTitle: string; question: SurveyQuestionItem }>()
    for (const p of builder?.pages ?? []) {
      for (const q of p.questions) {
        map.set(q.id, { pageTitle: p.title, question: q })
      }
    }
    return map
  }, [builder])

  const openEditQuestion = useCallback((q: SurveyQuestionItem, pageTitle: string) => {
    setQuestionError(null)
    setEditQuestion({ q, pageTitle })
  }, [])

  const closeEditQuestion = useCallback(() => {
    setEditQuestion(null)
    setQuestionError(null)
  }, [])

  const saveEditQuestion = useCallback(async (payload: SurveyQuestionUpdateRequest) => {
    if (!editQuestion) return
    setQuestionError(null)
    await axiosMainRequest.patch(apiRoutes.surveys.surveyQuestion(surveyId, editQuestion.q.id), payload)
    await loadBuilder()
    closeEditQuestion()
  }, [editQuestion, surveyId])

  async function addSection () {
    setQuestionError(null)
    const title = addSectionTitle.trim()
    if (!title) {
      setQuestionError('Введите название секции')
      return
    }
    setIsAddingSection(true)
    try {
      await axiosMainRequest.post(apiRoutes.surveys.surveyPages(surveyId), {
        title,
        sectionType: addSectionType,
      })
      await loadBuilder()
      setAddSectionOpen(false)
      setAddSectionTitle('')
    } catch (err: unknown) {
      setQuestionError(getApiErrorMessage(err))
    } finally {
      setIsAddingSection(false)
    }
  }

  async function addQuestion (pageId: string) {
    setAddQuestionPageId(pageId)
    setAddQuestionTitle('')
    setAddQuestionType('short_text')
    setAddQuestionOpen(true)
  }

  async function submitAddQuestion () {
    const title = addQuestionTitle.trim()
    if (!title) {
      setQuestionError('Введите формулировку вопроса')
      return
    }
    setIsAddingQuestion(true)
    setQuestionError(null)
    try {
      await axiosMainRequest.post(apiRoutes.surveys.surveyQuestions(surveyId), {
        pageId: addQuestionPageId,
        type: addQuestionType,
        title,
      })
      await loadBuilder()
      setAddQuestionOpen(false)
    } catch (err: unknown) {
      setQuestionError(getApiErrorMessage(err))
    } finally {
      setIsAddingQuestion(false)
    }
  }

  async function reorder (pageIds: string[], questionIds: string[]) {
    try {
      await axiosMainRequest.post(apiRoutes.surveys.surveyReorder(surveyId), {
        pageIds: pageIds.length ? pageIds : undefined,
        questionIds: questionIds.length ? questionIds : undefined,
      })
      await loadBuilder()
    } catch (err: unknown) {
      setQuestionError(getApiErrorMessage(err))
    }
  }

  async function deleteSection (pageId: string) {
    const page = builder?.pages?.find((p) => p.id === pageId)
    const ok = window.confirm(page ? `Удалить секцию «${page.title}» и все вопросы?` : 'Удалить секцию?')
    if (!ok) return
    setQuestionError(null)
    try {
      await axiosMainRequest.delete(apiRoutes.surveys.surveyPage(surveyId, pageId))
      await loadBuilder()
    } catch (err: unknown) {
      setQuestionError(getApiErrorMessage(err))
    }
  }

  async function deleteQuestion (questionId: string) {
    const q = questionsById.get(questionId)?.question
    const ok = window.confirm(q ? `Удалить вопрос «${q.title}»?` : 'Удалить вопрос?')
    if (!ok) return
    setQuestionError(null)
    try {
      await axiosMainRequest.delete(apiRoutes.surveys.surveyQuestion(surveyId, questionId))
      await loadBuilder()
    } catch (err: unknown) {
      setQuestionError(getApiErrorMessage(err))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className="titleH1">Анкета</h1>
        <span className={styles.pill}>{categoryLabel}</span>
      </div>

      <div className={styles.subTitle}>
        {survey ? <span className={styles.surveyTitle}>{survey.title}</span> : 'Загрузка…'}
      </div>

      {!isLoading && !error && !shouldPickTemplate ? (
        <div className={styles.projectsRow}>
          <span>Проекты:</span>
          {attachedProjects.length ? (
            attachedProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.projectPill}
                onClick={() => {
                  window.location.href = `/projects/${encodeURIComponent(p.id)}`
                }}
                title={`Открыть проект «${p.name}»`}
              >
                {p.name}
              </button>
            ))
          ) : (
            <span>не прикреплена</span>
          )}
        </div>
      ) : null}

      {!shouldPickTemplate ? (
        <div className={styles.hint} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>Ссылка для прохождения</span>
          {projectIdFromQuery ? (
            <Button type="button" variant="ghost" onClick={copyTestLink} disabled={isLoading}>
              Скопировать (тест)
            </Button>
          ) : (
            <span style={{ opacity: 0.75 }}>Откройте анкету из проекта, чтобы получить ссылку</span>
          )}
        </div>
      ) : null}

      <div className={styles.body}>
        {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {!isLoading && !error && survey && shouldPickTemplate ? (
          <section className={styles.templatePick}>
            <div className={styles.hint}>
              Выберите шаблон для анкеты ценового мониторинга. Шаблон применяется один раз и создаёт страницы и вопросы.
            </div>

            <div className={styles.templatePickBody}>
              <div className={styles.templateGrid}>
                {templates.map((t) => {
                  const isSelected = selectedTemplateKey === t.key
                  return (
                    <div
                      key={t.key}
                      role="button"
                      tabIndex={0}
                      className={`${styles.templateCard} ${isSelected ? styles.templateCardSelected : ''}`.trim()}
                      onClick={() => setSelectedTemplateKey(t.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedTemplateKey(t.key)
                      }}
                    >
                      <div className={styles.templateTitle}>{t.title}</div>
                      <div className={styles.templateDescription}>{t.description}</div>

                      <div className={styles.templateMeta}>
                        <div className={styles.templateMetaTitle}>Что будет создано</div>
                        <ul className={styles.templateSteps}>
                          {t.steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className={styles.templateMeta}>
                        <div className={styles.templateMetaTitle}>Когда выбирать</div>
                        <ul className={styles.templateHighlights}>
                          {t.highlights.map((h) => (
                            <li key={h}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {applyError ? <div className={styles.error} style={{ marginTop: 12 }}>{applyError}</div> : null}

            <div className={styles.templatePickFooter}>
              <Button type="button" variant="primary" onClick={applyTemplate} disabled={isApplying}>
                Применить шаблон
              </Button>
            </div>
          </section>
        ) : null}

        {!isLoading && !error && survey && !shouldPickTemplate && builder ? (
          <section>
            <div className={styles.toolbar}>
              <Button type="button" variant="ghost" onClick={() => setSimulatorOpen(true)}>
                Симуляция
              </Button>
              <Button type="button" variant="ghost" onClick={loadAnalytics}>
                Аналитика
              </Button>
            </div>

            {analytics && (
              <div className={styles.analyticsBlock}>
                <div className={styles.analyticsRow}>
                  <span>Прохождений:</span>
                  <strong>{analytics.totalAttempts}</strong>
                </div>
                <div className={styles.analyticsRow}>
                  <span>Завершённых:</span>
                  <strong>{analytics.completedAttempts}</strong>
                </div>
                {analytics.avgScorePercent != null && (
                  <div className={styles.analyticsRow}>
                    <span>Средний балл:</span>
                    <strong>{analytics.avgScorePercent.toFixed(1)}%</strong>
                  </div>
                )}
              </div>
            )}

            {questionError ? <div className={styles.error} style={{ marginBottom: 10 }}>{questionError}</div> : null}

            <SurveySectionList
              builder={builder}
              canEdit={canEdit}
              onAddSection={() => setAddSectionOpen(true)}
              onAddQuestion={addQuestion}
              onEditQuestion={openEditQuestion}
              onDeleteQuestion={deleteQuestion}
              onDeleteSection={deleteSection}
              onReorder={reorder}
            />

            <Modal open={addSectionOpen} onClose={() => !isAddingSection && setAddSectionOpen(false)} size="xs">
              <Modal.Header>
                <Modal.Title>Добавить секцию</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Название *</div>
                    <Input value={addSectionTitle} onChange={(v) => setAddSectionTitle(String(v ?? ''))} placeholder="Например: Скрининг" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Тип</div>
                    <SelectPicker
                      value={addSectionType}
                      onChange={(v) => setAddSectionType((v as 'regular' | 'loop') ?? 'regular')}
                      data={[
                        { value: 'regular', label: 'Обычная' },
                        { value: 'loop', label: 'Цикличная (повтор по элементам)' },
                      ]}
                      cleanable={false}
                      searchable={false}
                      block
                    />
                  </div>
                </div>
                {questionError ? <div className={styles.error} style={{ marginTop: 10 }}>{questionError}</div> : null}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onClick={() => setAddSectionOpen(false)} disabled={isAddingSection}>
                  Отмена
                </Button>
                <Button type="button" variant="primary" onClick={addSection} disabled={isAddingSection}>
                  Добавить
                </Button>
              </Modal.Footer>
            </Modal>

            <Modal open={addQuestionOpen} onClose={() => !isAddingQuestion && setAddQuestionOpen(false)} size="sm">
              <Modal.Header>
                <Modal.Title>Добавить вопрос</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Секция</div>
                    <SelectPicker
                      value={addQuestionPageId}
                      onChange={(v) => setAddQuestionPageId(String(v ?? ''))}
                      data={(builder?.pages ?? []).map((p) => ({ value: p.id, label: p.title }))}
                      cleanable={false}
                      searchable={false}
                      block
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Тип вопроса *</div>
                    <SelectPicker
                      value={addQuestionType}
                      onChange={(v) => setAddQuestionType(String(v ?? 'short_text'))}
                      data={[
                        { value: 'short_text', label: 'Короткий текст' },
                        { value: 'long_text', label: 'Длинный текст' },
                        { value: 'number', label: 'Число' },
                        { value: 'email', label: 'Email' },
                        { value: 'single_choice', label: 'Одиночный выбор' },
                        { value: 'multi_choice', label: 'Множественный выбор' },
                        { value: 'scale', label: 'Шкала' },
                        { value: 'matrix', label: 'Табличный' },
                        { value: 'date', label: 'Дата' },
                        { value: 'time', label: 'Время' },
                        { value: 'rank', label: 'Ранг' },
                        { value: 'photo', label: 'Фото' },
                      ]}
                      cleanable={false}
                      searchable={false}
                      block
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Формулировка *</div>
                    <Input value={addQuestionTitle} onChange={(v) => setAddQuestionTitle(String(v ?? ''))} placeholder="Текст вопроса" />
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onClick={() => setAddQuestionOpen(false)} disabled={isAddingQuestion}>
                  Отмена
                </Button>
                <Button type="button" variant="primary" onClick={submitAddQuestion} disabled={isAddingQuestion}>
                  Добавить
                </Button>
              </Modal.Footer>
            </Modal>

            <SurveyQuestionEditorModal
              open={Boolean(editQuestion)}
              question={editQuestion?.q ?? null}
              pageTitle={editQuestion?.pageTitle ?? ''}
              onClose={closeEditQuestion}
              onSave={saveEditQuestion}
            />

            <SurveySimulatorPanel
              surveyId={surveyId}
              builder={builder}
              open={simulatorOpen}
              onClose={() => setSimulatorOpen(false)}
            />
          </section>
        ) : null}
      </div>
    </div>
  )
}

function formatCategory (category: SurveyCategory | null) {
  if (category === 'mystery') return 'Мистери'
  if (category === 'price_monitoring') return 'Ценовой мониторинг'
  return 'Анкета'
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

function EditIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

