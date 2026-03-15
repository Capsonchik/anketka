'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type {
  SurveyBuilderResponse,
  SurveyAttachedProjectsResponse,
  SurveyItem,
  SurveyQuestionItem,
  SurveyQuestionUpdateRequest,
  SurveyResponse,
} from '@/entities/survey'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import { AddQuestionModal } from './SurveyPage/AddQuestionModal'
import { AddSectionModal } from './SurveyPage/AddSectionModal'
import {
  CHOICE_TYPES,
  COMMENT_MODE_FREE,
  COMMENT_MODE_OPTION,
  CREATE_NEW_SECTION_VALUE,
  type AddQuestionOptionDraft,
  buildOptionValue,
  createEmptyOptionDraft,
  getBulkAddPreviewCount,
  getBulkOptionValues,
  normalizeOptionLabel,
} from './SurveyPage/addQuestionHelpers'
import { SurveyQuestionEditorModal } from './SurveyQuestionEditorModal'
import { SurveySectionList } from './SurveySectionList'
import { SurveySimulatorPanel } from './SurveySimulatorPanel'
import styles from './SurveyPage.module.css'

export function SurveyEditorPage ({ surveyId }: { surveyId: string }) {
  const searchParams = useSearchParams()
  const projectIdFromQuery = useMemo(() => searchParams.get('projectId'), [searchParams])

  const [survey, setSurvey] = useState<SurveyItem | null>(null)
  const [builder, setBuilder] = useState<SurveyBuilderResponse | null>(null)
  const [attachedProjects, setAttachedProjects] = useState<Array<{ id: string; name: string; attachedAt: string }>>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editQuestion, setEditQuestion] = useState<{ q: SurveyQuestionItem; pageTitle: string } | null>(null)
  const [questionError, setQuestionError] = useState<string | null>(null)

  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [addSectionTitle, setAddSectionTitle] = useState('')
  const [addSectionType, setAddSectionType] = useState<'regular' | 'loop'>('regular')
  const [isAddingSection, setIsAddingSection] = useState(false)

  const [addQuestionOpen, setAddQuestionOpen] = useState(false)
  const [addQuestionPageId, setAddQuestionPageId] = useState<string>('')
  const [addQuestionNewSectionTitle, setAddQuestionNewSectionTitle] = useState('')
  const [addQuestionCode, setAddQuestionCode] = useState('')
  const [addQuestionTitle, setAddQuestionTitle] = useState('')
  const [addQuestionDescription, setAddQuestionDescription] = useState('')
  const [addQuestionType, setAddQuestionType] = useState('short_text')
  const [addQuestionPlaceholder, setAddQuestionPlaceholder] = useState('')
  const [addQuestionWeight, setAddQuestionWeight] = useState('')
  const [addQuestionOptions, setAddQuestionOptions] = useState<AddQuestionOptionDraft[]>([])
  const [addQuestionOptionInput, setAddQuestionOptionInput] = useState('')
  const [addQuestionBulkOptions, setAddQuestionBulkOptions] = useState('')
  const [addQuestionExclusiveOptionIds, setAddQuestionExclusiveOptionIds] = useState<string[]>([])
  const [addQuestionCommentOptionIds, setAddQuestionCommentOptionIds] = useState<string[]>([])
  const [addQuestionRequired, setAddQuestionRequired] = useState(false)
  const [addQuestionAllowNa, setAddQuestionAllowNa] = useState(false)
  const [addQuestionAllowComment, setAddQuestionAllowComment] = useState(false)
  const [addQuestionCommentMode, setAddQuestionCommentMode] = useState(COMMENT_MODE_FREE)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)

  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const [analytics, setAnalytics] = useState<{
    totalAttempts: number
    completedAttempts: number
    avgScorePercent: number | null
    scoreDistribution: Array<{ bucket: string; count: number }>
  } | null>(null)

  const canEdit = (survey?.status ?? 'created') !== 'published'
  const bulkOptionPreviewCount = useMemo(
    () => getBulkAddPreviewCount(addQuestionBulkOptions, addQuestionOptions),
    [addQuestionBulkOptions, addQuestionOptions],
  )

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
    const nextBuilder = res.data ?? null
    setBuilder(nextBuilder)
    return nextBuilder
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

  function openAddSectionModal () {
    const nextNumber = (builder?.pages.length ?? 0) + 1
    setQuestionError(null)
    setAddSectionTitle(`Секция ${nextNumber}`)
    setAddSectionType('regular')
    setAddSectionOpen(true)
  }

  async function submitAddSection () {
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
    setQuestionError(null)
    setAddQuestionPageId(pageId)
    setAddQuestionNewSectionTitle('')
    setAddQuestionCode('')
    setAddQuestionTitle('')
    setAddQuestionDescription('')
    setAddQuestionType('short_text')
    setAddQuestionPlaceholder('')
    setAddQuestionWeight('')
    setAddQuestionOptions([])
    setAddQuestionOptionInput('')
    setAddQuestionBulkOptions('')
    setAddQuestionExclusiveOptionIds([])
    setAddQuestionCommentOptionIds([])
    setAddQuestionRequired(false)
    setAddQuestionAllowNa(false)
    setAddQuestionAllowComment(false)
    setAddQuestionCommentMode(COMMENT_MODE_FREE)
    setAddQuestionOpen(true)
  }

  function addQuestionFromHeader () {
    setQuestionError(null)
    const firstPageId = builder?.pages[0]?.id
    const hasPages = Boolean(firstPageId)
    const nextNumber = (builder?.pages.length ?? 0) + 1
    setAddQuestionPageId(firstPageId ?? CREATE_NEW_SECTION_VALUE)
    setAddQuestionNewSectionTitle(hasPages ? '' : `Секция ${nextNumber}`)
    setAddQuestionCode('')
    setAddQuestionTitle('')
    setAddQuestionDescription('')
    setAddQuestionType('short_text')
    setAddQuestionPlaceholder('')
    setAddQuestionWeight('')
    setAddQuestionOptions([])
    setAddQuestionOptionInput('')
    setAddQuestionBulkOptions('')
    setAddQuestionExclusiveOptionIds([])
    setAddQuestionCommentOptionIds([])
    setAddQuestionRequired(false)
    setAddQuestionAllowNa(false)
    setAddQuestionAllowComment(false)
    setAddQuestionCommentMode(COMMENT_MODE_FREE)
    setAddQuestionOpen(true)
  }

  function setQuestionType (nextType: string) {
    setAddQuestionType(nextType)
    if (!CHOICE_TYPES.has(nextType)) {
      setAddQuestionOptions([])
      setAddQuestionOptionInput('')
      setAddQuestionBulkOptions('')
      setAddQuestionExclusiveOptionIds([])
      setAddQuestionCommentOptionIds([])
      if (addQuestionCommentMode === COMMENT_MODE_OPTION) {
        setAddQuestionCommentMode(COMMENT_MODE_FREE)
      }
    }
  }

  function addOptionValue (rawValue: string) {
    const value = rawValue.trim()
    if (!value) return
    setAddQuestionOptions((prev) => {
      const hasDuplicate = prev.some((opt) => normalizeOptionLabel(opt.label) === normalizeOptionLabel(value))
      if (hasDuplicate) return prev
      return [...prev, createEmptyOptionDraft(prev.length + 1, value)]
    })
  }

  function updateOptionRow (id: string, patch: Partial<AddQuestionOptionDraft>) {
    setAddQuestionOptions((prev) => prev.map((opt) => (opt.id === id ? { ...opt, ...patch } : opt)))
  }

  function removeOptionRow (id: string) {
    setAddQuestionOptions((prev) => prev.filter((opt) => opt.id !== id))
    setAddQuestionExclusiveOptionIds((prev) => prev.filter((item) => item !== id))
    setAddQuestionCommentOptionIds((prev) => prev.filter((item) => item !== id))
  }

  function addOptionFromInput () {
    addOptionValue(addQuestionOptionInput)
    setAddQuestionOptionInput('')
  }

  function addOptionsFromBulkInput () {
    const items = getBulkOptionValues(addQuestionBulkOptions)
    if (!items.length) return
    items.forEach((item) => addOptionValue(item))
    setAddQuestionBulkOptions('')
  }

  async function submitAddQuestion () {
    const code = addQuestionCode.trim()
    const title = addQuestionTitle.trim()
    const description = addQuestionDescription.trim()
    const placeholder = addQuestionPlaceholder.trim()
    const weightRaw = addQuestionWeight.trim()
    const weight = weightRaw ? Number(weightRaw.replace(',', '.')) : 0
    const isChoiceType = CHOICE_TYPES.has(addQuestionType)
    const optionDrafts = addQuestionOptions
      .map((opt, index) => ({
        ...opt,
        sortOrder: index + 1,
        label: opt.label.trim(),
        value: (opt.value.trim() || buildOptionValue(opt.label.trim(), index + 1)),
        pointsValue: opt.points.trim(),
      }))
      .filter((opt) => opt.label.length > 0 || opt.value.length > 0 || opt.pointsValue.length > 0)
    const optionPoints = optionDrafts.map((opt) => (opt.pointsValue ? Number(opt.pointsValue.replace(',', '.')) : 0))
    const choiceWeight = isChoiceType
      ? (addQuestionType === 'single_choice'
          ? (optionPoints.length ? Math.max(...optionPoints) : 0)
          : optionPoints.reduce((acc, item) => acc + item, 0))
      : 0
    if (!title) {
      setQuestionError('Введите формулировку вопроса')
      return
    }
    if (!code) {
      setQuestionError('Введите клиентский код вопроса')
      return
    }
    if (addQuestionAllowComment && addQuestionCommentMode !== COMMENT_MODE_OPTION && addQuestionCommentMode !== COMMENT_MODE_FREE) {
      setQuestionError('Выберите режим комментария')
      return
    }
    if (weightRaw && (!Number.isFinite(weight) || weight < 0)) {
      setQuestionError('Вес вопроса должен быть числом больше или равным 0')
      return
    }
    if (isChoiceType && optionDrafts.length < 2) {
      setQuestionError('Добавьте минимум 2 варианта ответа')
      return
    }
    if (addQuestionAllowComment && addQuestionCommentMode === COMMENT_MODE_OPTION && addQuestionCommentOptionIds.length === 0) {
      setQuestionError('Выберите варианты ответа для комментария')
      return
    }
    for (const opt of optionDrafts) {
      if (!opt.label) {
        setQuestionError('У каждого варианта заполните текст')
        return
      }
      const points = opt.pointsValue ? Number(opt.pointsValue.replace(',', '.')) : 0
      if (!Number.isFinite(points) || points < 0) {
        setQuestionError('Вес варианта должен быть числом больше или равным 0')
        return
      }
    }
    setIsAddingQuestion(true)
    setQuestionError(null)
    try {
      let targetPageId = addQuestionPageId
      if (targetPageId === CREATE_NEW_SECTION_VALUE || !targetPageId) {
        const sectionTitle = addQuestionNewSectionTitle.trim()
        if (!sectionTitle) {
          setQuestionError('Введите название новой секции')
          setIsAddingQuestion(false)
          return
        }
        await axiosMainRequest.post(apiRoutes.surveys.surveyPages(surveyId), {
          title: sectionTitle,
          sectionType: 'regular',
        })
        const nextBuilder = await loadBuilder()
        const createdPage = findCreatedSection(nextBuilder, sectionTitle)
        if (!createdPage?.id) {
          setQuestionError('Не удалось определить созданную секцию')
          setIsAddingQuestion(false)
          return
        }
        targetPageId = createdPage.id
      }
      const config: Record<string, unknown> = {}
      if (placeholder) {
        config.placeholder = placeholder
      }
      if (addQuestionAllowComment) {
        config.commentMode = addQuestionCommentMode
        config.commentPlacement = addQuestionCommentMode === COMMENT_MODE_OPTION ? 'option' : 'free'
        if (addQuestionCommentMode === COMMENT_MODE_OPTION) {
          const selectedCommentValues = optionDrafts
            .filter((opt) => addQuestionCommentOptionIds.includes(opt.id))
            .map((opt) => opt.value)
          config.commentOptionValues = selectedCommentValues
        }
      }

      const createQuestionRes = await axiosMainRequest.post<{ question?: { id?: string } }>(apiRoutes.surveys.surveyQuestions(surveyId), {
        pageId: targetPageId,
        type: addQuestionType,
        code,
        title,
        description: description || undefined,
        required: addQuestionRequired,
        weight: isChoiceType ? choiceWeight : weight,
        allowNa: addQuestionAllowNa,
        allowComment: addQuestionAllowComment,
        config: Object.keys(config).length ? config : undefined,
      })

      const questionId = createQuestionRes.data?.question?.id
      if (isChoiceType && questionId) {
        for (const opt of optionDrafts) {
          const points = opt.pointsValue ? Number(opt.pointsValue.replace(',', '.')) : 0
          await axiosMainRequest.post(`${apiRoutes.surveys.surveyQuestion(surveyId, questionId)}/options`, {
            label: opt.label,
            value: opt.value,
            sortOrder: opt.sortOrder,
            points,
            isExclusive: addQuestionExclusiveOptionIds.includes(opt.id),
            isNA: false,
          })
        }
      }
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
      <div className={styles.topBar}>
        <h1 className="titleH1">{survey?.title ?? 'Загрузка...'}</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.headerTextButton} onClick={openAddSectionModal} disabled={!canEdit || isLoading || isAddingSection}>
            Добавить секцию
          </button>
          <button type="button" className={styles.headerTextButton} onClick={addQuestionFromHeader} disabled={!canEdit || isLoading}>
            Добавить вопрос
          </button>
          <button type="button" className={styles.headerTextButton} onClick={() => setSimulatorOpen(true)} disabled={isLoading}>
            Симуляция
          </button>
          <button type="button" className={styles.headerTextButton} onClick={loadAnalytics} disabled={isLoading}>
            Аналитика
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.body}>
          {!isLoading && !error ? (
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

          {isLoading ? <div className={styles.hint}>Загрузка...</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}

          {!isLoading && !error && survey && builder ? (
            <section>
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
                onAddQuestion={addQuestion}
                onEditQuestion={openEditQuestion}
                onDeleteQuestion={deleteQuestion}
                onDeleteSection={deleteSection}
                onReorder={reorder}
              />

              <AddSectionModal
                open={addSectionOpen}
                isAdding={isAddingSection}
                title={addSectionTitle}
                sectionType={addSectionType}
                onClose={() => setAddSectionOpen(false)}
                onTitleChange={setAddSectionTitle}
                onSectionTypeChange={setAddSectionType}
                onSubmit={submitAddSection}
              />

              <AddQuestionModal
                open={addQuestionOpen}
                isAdding={isAddingQuestion}
                error={questionError}
                builderPages={(builder?.pages ?? []).map((p) => ({ id: p.id, title: p.title }))}
                pageId={addQuestionPageId}
                newSectionTitle={addQuestionNewSectionTitle}
                code={addQuestionCode}
                title={addQuestionTitle}
                description={addQuestionDescription}
                questionType={addQuestionType}
                placeholder={addQuestionPlaceholder}
                weight={addQuestionWeight}
                options={addQuestionOptions}
                optionInput={addQuestionOptionInput}
                bulkOptions={addQuestionBulkOptions}
                bulkOptionPreviewCount={bulkOptionPreviewCount}
                exclusiveOptionIds={addQuestionExclusiveOptionIds}
                commentOptionIds={addQuestionCommentOptionIds}
                required={addQuestionRequired}
                allowNa={addQuestionAllowNa}
                allowComment={addQuestionAllowComment}
                commentMode={addQuestionCommentMode}
                onClose={() => setAddQuestionOpen(false)}
                onSubmit={submitAddQuestion}
                onPageChange={(nextValue) => {
                  setAddQuestionPageId(nextValue)
                  if (nextValue === CREATE_NEW_SECTION_VALUE && !addQuestionNewSectionTitle.trim()) {
                    const nextNumber = (builder?.pages.length ?? 0) + 1
                    setAddQuestionNewSectionTitle(`Секция ${nextNumber}`)
                  }
                }}
                onNewSectionTitleChange={setAddQuestionNewSectionTitle}
                onCodeChange={setAddQuestionCode}
                onTitleChange={setAddQuestionTitle}
                onDescriptionChange={setAddQuestionDescription}
                onQuestionTypeChange={setQuestionType}
                onPlaceholderChange={setAddQuestionPlaceholder}
                onWeightChange={setAddQuestionWeight}
                onOptionInputChange={setAddQuestionOptionInput}
                onOptionInputEnter={addOptionFromInput}
                onBulkOptionsChange={setAddQuestionBulkOptions}
                onBulkOptionsAdd={addOptionsFromBulkInput}
                onOptionRemove={removeOptionRow}
                onOptionPointsChange={(id, points) => updateOptionRow(id, { points })}
                onExclusiveOptionIdsChange={setAddQuestionExclusiveOptionIds}
                onCommentOptionIdsChange={setAddQuestionCommentOptionIds}
                onRequiredChange={setAddQuestionRequired}
                onAllowNaChange={setAddQuestionAllowNa}
                onAllowCommentChange={setAddQuestionAllowComment}
                onCommentModeChange={setAddQuestionCommentMode}
              />

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
    </div>
  )
}

function findCreatedSection (builder: SurveyBuilderResponse | null, title: string) {
  if (!builder?.pages.length) return null
  const byTitle = builder.pages.filter((page) => page.title.trim() === title.trim())
  if (byTitle.length === 0) return builder.pages[builder.pages.length - 1]
  return byTitle.sort((a, b) => b.sortOrder - a.sortOrder)[0]
}
