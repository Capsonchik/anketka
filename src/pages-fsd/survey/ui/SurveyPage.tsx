'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Checkbox, Input, Modal } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type {
  SurveyApplyTemplateRequest,
  SurveyBuilderResponse,
  SurveyCategory,
  SurveyAttachedProjectsResponse,
  SurveyItem,
  SurveyQuestionItem,
  SurveyQuestionUpdateRequest,
  SurveyResponse,
} from '@/entities/survey'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
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

  const [editQuestionId, setEditQuestionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editRequired, setEditRequired] = useState(false)
  const [editSortOrder, setEditSortOrder] = useState<string>('')
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)

  const templateKey = (survey?.templateKey ?? null) as string | null

  const shouldPickTemplate = survey?.category === 'price_monitoring' && !templateKey

  const categoryLabel = useMemo(() => formatCategory(survey?.category ?? null), [survey?.category])

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

  const editQuestion = editQuestionId ? questionsById.get(editQuestionId)?.question ?? null : null

  function openEditQuestion (questionId: string) {
    const q = questionsById.get(questionId)?.question
    if (!q) return
    setQuestionError(null)
    setEditQuestionId(questionId)
    setEditTitle(q.title)
    setEditRequired(Boolean(q.required))
    setEditSortOrder(String(q.sortOrder ?? ''))
  }

  function closeEditQuestion () {
    if (isSavingQuestion) return
    setEditQuestionId(null)
    setQuestionError(null)
  }

  async function submitEditQuestion () {
    if (!editQuestionId) return
    setQuestionError(null)

    const title = editTitle.trim()
    if (!title) {
      setQuestionError('Введите формулировку вопроса')
      return
    }

    const sortRaw = editSortOrder.trim()
    let sortOrder: number | null = null
    if (sortRaw) {
      const parsed = Number(sortRaw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setQuestionError('Порядок должен быть числом ≥ 0')
        return
      }
      sortOrder = parsed
    }

    setIsSavingQuestion(true)
    try {
      const payload: SurveyQuestionUpdateRequest = {
        title,
        required: Boolean(editRequired),
        sortOrder,
      }
      await axiosMainRequest.patch(apiRoutes.surveys.surveyQuestion(surveyId, editQuestionId), payload)
      await loadBuilder()
      closeEditQuestion()
    } catch (err: unknown) {
      setQuestionError(getApiErrorMessage(err))
    } finally {
      setIsSavingQuestion(false)
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

        {!isLoading && !error && survey && !shouldPickTemplate ? (
          <section>
            <div className={styles.hint}>
              {survey.category === 'price_monitoring'
                ? `Шаблон: ${templateKey || '—'}`
                : 'Категория без шаблонов (пока отображаем структуру).'}
            </div>

            {questionError ? <div className={styles.error} style={{ marginTop: 10 }}>{questionError}</div> : null}

            <div className={styles.tableWrap} style={{ marginTop: 12 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Страница</th>
                    <th className={styles.th}>Вопрос</th>
                    <th className={styles.th}>Тип</th>
                    <th className={styles.th} style={{ width: 110 }}>Обяз.</th>
                    <th className={styles.th} style={{ width: 112 }} />
                  </tr>
                </thead>
                <tbody>
                  {(builder?.pages ?? []).flatMap((p) => {
                    if (p.questions.length === 0) {
                      return (
                        <tr key={`p:${p.id}:empty`}>
                          <td className={styles.td}>{p.title}</td>
                          <td className={styles.tdWrap}>—</td>
                          <td className={styles.td}>—</td>
                          <td className={styles.td}>—</td>
                          <td className={styles.td} />
                        </tr>
                      )
                    }
                    return p.questions.map((q) => (
                      <tr key={`q:${q.id}`}>
                        <td className={styles.td}>{p.title}</td>
                        <td className={styles.tdWrap}>{q.title}</td>
                        <td className={styles.td}>{q.type}</td>
                        <td className={styles.td}>{q.required ? 'Да' : 'Нет'}</td>
                        <td className={styles.td}>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.iconButton}
                              aria-label="Редактировать"
                              onClick={() => openEditQuestion(q.id)}
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                              aria-label="Удалить"
                              onClick={() => deleteQuestion(q.id)}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  })}
                  {builder && builder.pages.length === 0 ? (
                    <tr>
                      <td className={styles.td} colSpan={5}>Структура ещё не создана</td>
                    </tr>
                  ) : null}
                  {!builder ? (
                    <tr>
                      <td className={styles.td} colSpan={5}>Загрузка структуры…</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <Modal open={Boolean(editQuestionId)} onClose={closeEditQuestion} size="sm">
              <Modal.Header>
                <Modal.Title>Редактировать вопрос</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className={styles.hint} style={{ marginBottom: 10 }}>
                  {editQuestion ? <span>{editQuestion.type} · {questionsById.get(editQuestion.id)?.pageTitle}</span> : null}
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Формулировка</div>
                    <Input value={editTitle} onChange={(v) => setEditTitle(String(v ?? ''))} />
                  </div>

                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Порядок (sortOrder)</div>
                    <Input value={editSortOrder} onChange={(v) => setEditSortOrder(String(v ?? ''))} placeholder="Например: 1" />
                  </div>

                  <Checkbox checked={editRequired} onChange={(_, checked) => setEditRequired(Boolean(checked))}>
                    Обязательный вопрос
                  </Checkbox>
                </div>

                {questionError ? <div className={styles.error} style={{ marginTop: 10 }}>{questionError}</div> : null}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onClick={closeEditQuestion} disabled={isSavingQuestion}>
                  Отмена
                </Button>
                <Button type="button" variant="primary" onClick={submitEditQuestion} disabled={isSavingQuestion}>
                  Сохранить
                </Button>
              </Modal.Footer>
            </Modal>
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

