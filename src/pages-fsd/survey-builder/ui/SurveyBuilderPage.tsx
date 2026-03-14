'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import Image from 'next/image'
import { DatePicker, Input, Modal, SelectPicker, Toggle } from 'rsuite'
import { useRouter } from 'next/navigation'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { SurveyCreateResponse, SurveyResponse, SurveysResponse, SurveyItem, SurveyStatus } from '@/entities/survey'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import styles from './SurveyBuilderPage.module.css'

const statusOptions: Array<{ value: SurveyStatus | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'created', label: 'Черновик' },
  { value: 'moderation', label: 'На модерации' },
  { value: 'published', label: 'Опубликована' },
  { value: 'archived', label: 'Архив' },
]

export function SurveyBuilderPage () {
  const router = useRouter()

  const [surveys, setSurveys] = useState<SurveyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [titleFilter, setTitleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | ''>('')
  const [idFilter, setIdFilter] = useState('')
  const [createdAtFromFilter, setCreatedAtFromFilter] = useState<Date | null>(null)
  const [createdAtToFilter, setCreatedAtToFilter] = useState<Date | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createTitle, setCreateTitle] = useState('')
  const [createTab, setCreateTab] = useState<'main' | 'questions'>('main')
  const [createDescription, setCreateDescription] = useState('')
  const [targetAudienceInput, setTargetAudienceInput] = useState('')
  const [targetAudienceTags, setTargetAudienceTags] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [inspectionObjects, setInspectionObjects] = useState('')
  const [isPerSectionMode, setIsPerSectionMode] = useState(true)
  const [hasBriefing, setHasBriefing] = useState(false)
  const [questionsExcelFile, setQuestionsExcelFile] = useState<File | null>(null)
  const [isQuestionsDragOver, setIsQuestionsDragOver] = useState(false)

  const [deleteSurveyId, setDeleteSurveyId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [actionSurveyId, setActionSurveyId] = useState<string | null>(null)

  const hasFilters = useMemo(
    () => (
      titleFilter.trim().length > 0 ||
      statusFilter !== '' ||
      idFilter.trim().length > 0 ||
      Boolean(createdAtFromFilter) ||
      Boolean(createdAtToFilter)
    ),
    [titleFilter, statusFilter, idFilter, createdAtFromFilter, createdAtToFilter],
  )

  async function loadSurveys (opts?: { q?: string; status?: SurveyStatus | '' }) {
    setIsLoading(true)
    setError(null)
    try {
      const q = (opts?.q ?? titleFilter).trim()
      const st = opts?.status ?? statusFilter
      const params: Record<string, string> = {}
      if (q) params.q = q
      if (st) params.status = st
      const res = await axiosMainRequest.get<SurveysResponse>(apiRoutes.surveys.surveys, { params })
      setSurveys(res.data.items ?? [])
    } catch (err: unknown) {
      setSurveys([])
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSurveys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadSurveys({ q: titleFilter, status: statusFilter })
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleFilter, statusFilter])

  const displayedSurveys = useMemo(() => {
    const idNeedle = idFilter.trim().toLowerCase()
    const dateFromNeedle = createdAtFromFilter ? toDateKey(createdAtFromFilter) : null
    const dateToNeedle = createdAtToFilter ? toDateKey(createdAtToFilter) : null
    return surveys.filter((s) => {
      const displayId = surveyDisplayId(s.id)
      if (idNeedle && !displayId.includes(idNeedle)) return false
      const createdAt = String(s.createdAt).slice(0, 10)
      if (dateFromNeedle && createdAt < dateFromNeedle) return false
      if (dateToNeedle && createdAt > dateToNeedle) return false
      return true
    })
  }, [surveys, idFilter, createdAtFromFilter, createdAtToFilter])

  const isNoResults = !isLoading && !error && displayedSurveys.length === 0 && hasFilters

  function openCreate () {
    setIsCreateOpen(true)
    setSubmitError(null)
    setCreateTab('main')
    setCreateTitle('')
    setCreateDescription('')
    setTargetAudienceInput('')
    setTargetAudienceTags([])
    setStartDate(null)
    setEndDate(null)
    setInspectionObjects('')
    setIsPerSectionMode(true)
    setHasBriefing(false)
    setQuestionsExcelFile(null)
    setIsQuestionsDragOver(false)
  }

  function closeCreate () {
    if (isSubmitting) return
    setIsCreateOpen(false)
    setSubmitError(null)
  }

  async function submitCreate () {
    setSubmitError(null)
    const title = createTitle.trim()
    if (!title) {
      setSubmitError('Введите название анкеты')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await axiosMainRequest.post<SurveyCreateResponse>(apiRoutes.surveys.surveys, {
        title,
        category: 'price_monitoring',
      })
      const createdId = res.data?.survey?.id
      if (createdId && questionsExcelFile) {
        const formData = new FormData()
        formData.append('file', questionsExcelFile)
        await axiosMainRequest.post(
          apiRoutes.surveys.surveyImportQuestions(createdId),
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
      }
      await loadSurveys()
      closeCreate()
    } catch (err: unknown) {
      setSubmitError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitDelete (survey: SurveyItem) {
    setDeleteError(null)
    const ok = window.confirm(`Удалить анкету «${survey.title}»? Данные будут удалены без возможности восстановления.`)
    if (!ok) return

    setDeleteSurveyId(survey.id)
    try {
      await axiosMainRequest.delete(apiRoutes.surveys.survey(survey.id))
      await loadSurveys()
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err))
    } finally {
      setDeleteSurveyId(null)
    }
  }

  async function doPublish (survey: SurveyItem) {
    setActionSurveyId(survey.id)
    try {
      await axiosMainRequest.post<SurveyResponse>(apiRoutes.surveys.surveyPublish(survey.id))
      await loadSurveys()
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err))
    } finally {
      setActionSurveyId(null)
    }
  }

  async function doArchive (survey: SurveyItem) {
    setActionSurveyId(survey.id)
    try {
      await axiosMainRequest.post<SurveyResponse>(apiRoutes.surveys.surveyArchive(survey.id))
      await loadSurveys()
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err))
    } finally {
      setActionSurveyId(null)
    }
  }

  async function doUnarchive (survey: SurveyItem) {
    setActionSurveyId(survey.id)
    try {
      await axiosMainRequest.post<SurveyResponse>(apiRoutes.surveys.surveyUnarchive(survey.id))
      await loadSurveys()
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err))
    } finally {
      setActionSurveyId(null)
    }
  }

  async function doModeration (survey: SurveyItem) {
    setActionSurveyId(survey.id)
    try {
      await axiosMainRequest.post<SurveyResponse>(apiRoutes.surveys.surveyModeration(survey.id))
      await loadSurveys()
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err))
    } finally {
      setActionSurveyId(null)
    }
  }

  function openEditor (surveyId: string) {
    router.push(`/survey/${encodeURIComponent(surveyId)}`)
  }

  function addTargetAudienceTag () {
    const value = targetAudienceInput.trim()
    if (!value) return
    if (targetAudienceTags.includes(value)) {
      setTargetAudienceInput('')
      return
    }
    setTargetAudienceTags((prev) => [...prev, value])
    setTargetAudienceInput('')
  }

  function onTargetAudienceInputKeyDown (event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addTargetAudienceTag()
  }

  function removeTargetAudienceTag (tag: string) {
    setTargetAudienceTags((prev) => prev.filter((x) => x !== tag))
  }

  function onQuestionsExcelFileChange (event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setQuestionsExcelFile(file)
  }

  function onQuestionsDrop (event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsQuestionsDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    setQuestionsExcelFile(file)
  }

  function onQuestionsDragOver (event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsQuestionsDragOver(true)
  }

  function onQuestionsDragLeave () {
    setIsQuestionsDragOver(false)
  }

  function downloadQuestionsTemplate () {
    downloadFile(
      'survey-questions-template.csv',
      [
        'code,question_name,question_description,question_type,section_name,section_id,answers,max_selected,rank_options,scale_min,scale_max,scale_step,scale_min_label,scale_max_label,scale_ui,table_rows,table_cols,table_mode,table_max_per_row,photo_max,dynamic_source',
      ].join('\n'),
    )
  }

  function downloadQuestionsExample () {
    downloadFile(
      'survey-questions-example.csv',
      [
        'code,question_name,question_description,question_type,section_name,section_id,answers,max_selected,rank_options,scale_min,scale_max,scale_step,scale_min_label,scale_max_label,scale_ui,table_rows,table_cols,table_mode,table_max_per_row,photo_max,dynamic_source',
        'shopBrand,Бренд магазина,,select,Скрининг,,Пятёрочка|pyaterochka;Магнит|magnit,,,,,,,,,,,,',
        'shopAddress,Адрес магазина,,select,Скрининг,,ул. Ленина 1|lenina_1;ул. Советская 10|sov_10,,,,,,,,,,,,',
        'priceNoCard,Цена без карты,,money,Анкета,,,,,,,,,,,,,,',
        'facesCount,Кол-во фейсов,,number,Анкета,,,,,,,,,,,,,,',
        'productPhoto,Фото полки,,photo,Анкета,,,,,,,,,,,,,,5,',
      ].join('\n'),
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className="titleH1">Конструктор анкет</h1>
        <button
          type="button"
          className={styles.addIconButton}
          aria-label="Создать анкету"
          onClick={openCreate}
        >
          <Image src="/icons/add.svg" alt="" width={18} height={18} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.subTitle}>
        Список анкет вашей компании. Выберите анкету для редактирования.
      </div>

      {deleteError ? <div className={styles.error}>{deleteError}</div> : null}

      <div className={styles.filters}>
        <Input
          size="sm"
          className={`${styles.input} ${styles.filterTitle}`.trim()}
          value={titleFilter}
          onChange={(value) => setTitleFilter(String(value ?? ''))}
          placeholder="Название…"
          aria-label="Фильтр по названию"
        />
        <SelectPicker
          size="sm"
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(v) => setStatusFilter((v as SurveyStatus | '') ?? '')}
          data={statusOptions}
          placeholder="Статус"
          cleanable={false}
          searchable={false}
          style={{ width: 150 }}
          placement="bottomStart"
          container={() => document.body}
        />
        <Input
          size="sm"
          className={`${styles.input} ${styles.filterId}`.trim()}
          value={idFilter}
          onChange={(value) => setIdFilter(String(value ?? ''))}
          placeholder="ID…"
          aria-label="Фильтр по ID"
        />
        <DatePicker
          size="sm"
          className={styles.filterDate}
          value={createdAtFromFilter}
          onChange={(value) => setCreatedAtFromFilter(value ?? null)}
          oneTap
          cleanable
          editable={false}
          placeholder="Создана от"
          style={{ width: 150 }}
          placement="bottomStart"
          container={() => document.body}
        />
        <DatePicker
          size="sm"
          className={styles.filterDate}
          value={createdAtToFilter}
          onChange={(value) => setCreatedAtToFilter(value ?? null)}
          oneTap
          cleanable
          editable={false}
          placeholder="Создана до"
          style={{ width: 150 }}
          placement="bottomStart"
          container={() => document.body}
        />
      </div>

      {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {isNoResults ? <div className={styles.hint}>Ничего не найдено</div> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Название</th>
              <th className={styles.th}>Статус</th>
              <th className={styles.th}>Создана</th>
              <th className={styles.th} style={{ width: 180 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {displayedSurveys.map((s) => (
              <tr key={s.id} className={styles.row}>
                <td className={styles.td}>{surveyDisplayId(s.id)}</td>
                <td className={styles.tdWrap}>
                  <button type="button" className={styles.linkButton} onClick={() => openEditor(s.id)}>
                    {s.title}
                  </button>
                </td>
                <td className={styles.td}>
                  <span className={styles.statusBadge} data-status={s.status ?? 'created'}>
                    {formatStatus(s.status ?? 'created')}
                  </span>
                </td>
                <td className={styles.td}>{String(s.createdAt).slice(0, 10)}</td>
                <td className={styles.td}>
                  <div className={styles.rowActions}>
                    {(s.status === 'created' || s.status === 'moderation') && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Опубликовать"
                        title="Опубликовать"
                        disabled={actionSurveyId === s.id || deleteSurveyId === s.id}
                        onClick={() => doPublish(s)}
                      >
                        <PublishIcon />
                      </button>
                    )}
                    {s.status === 'created' && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="На модерацию"
                        title="На модерацию"
                        disabled={actionSurveyId === s.id || deleteSurveyId === s.id}
                        onClick={() => doModeration(s)}
                      >
                        <ModerationIcon />
                      </button>
                    )}
                    {s.status !== 'archived' && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Архивировать"
                        title="Архивировать"
                        disabled={actionSurveyId === s.id || deleteSurveyId === s.id}
                        onClick={() => doArchive(s)}
                      >
                        <AppIcon src="/icons/archive.svg" alt="Архивировать" />
                      </button>
                    )}
                    {s.status === 'archived' && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Восстановить"
                        title="Восстановить из архива"
                        disabled={actionSurveyId === s.id || deleteSurveyId === s.id}
                        onClick={() => doUnarchive(s)}
                      >
                        <AppIcon src="/icons/unarchive.svg" alt="Разархивировать" />
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Редактировать"
                      onClick={() => openEditor(s.id)}
                      disabled={deleteSurveyId === s.id}
                    >
                      <AppIcon src="/icons/edit.svg" alt="Изменить" />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                      aria-label="Удалить"
                      disabled={deleteSurveyId === s.id}
                      onClick={() => submitDelete(s)}
                    >
                      <AppIcon src="/icons/trash.svg" alt="Удалить" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {displayedSurveys.length === 0 && !isLoading ? (
              <tr>
                <td className={styles.td} colSpan={6}>
                  Анкеты не найдены
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={isCreateOpen} onClose={closeCreate} size="lg">
        <Modal.Header>
          <Modal.Title>Создание анкеты</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CreateTabButton isActive={createTab === 'main'} onClick={() => setCreateTab('main')}>
                Основное
              </CreateTabButton>
              <CreateTabButton isActive={createTab === 'questions'} onClick={() => setCreateTab('questions')}>
                Вопросы
              </CreateTabButton>
            </div>

            {createTab === 'main' ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Название">
                  <Input
                    value={createTitle}
                    onChange={(v) => setCreateTitle(String(v ?? ''))}
                    placeholder="Начните вводить..."
                  />
                </Field>

                <Field label="Описание">
                  <Input
                    as="textarea"
                    rows={3}
                    value={createDescription}
                    onChange={(v) => setCreateDescription(String(v ?? ''))}
                    placeholder="Кратко опишите цель и сценарий анкеты..."
                  />
                </Field>

                <Field label="Целевая аудитория (требования к тайным покупателям)">
                  <Input
                    value={targetAudienceInput}
                    onChange={(v) => setTargetAudienceInput(String(v ?? ''))}
                    onKeyDown={onTargetAudienceInputKeyDown}
                    onBlur={addTargetAudienceTag}
                    placeholder="Введите требование и нажмите Enter (например: опыт, возраст 25-45, наличие авто...)"
                  />
                </Field>
                {targetAudienceTags.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {targetAudienceTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(0,0,0,0.15)',
                          background: 'rgba(0,0,0,0.03)',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTargetAudienceTag(tag)}
                          style={{
                            border: 0,
                            background: 'transparent',
                            cursor: 'pointer',
                            lineHeight: 1,
                            padding: 0,
                            color: 'rgba(0,0,0,0.55)',
                            fontSize: 14,
                          }}
                          aria-label={`Удалить тег ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className={styles.hint}>Теги пока не добавлены</div>
                )}

                <Field label="Сроки проведения проверки">
                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                    <DatePicker
                      value={startDate}
                      onChange={(v) => setStartDate(v ?? null)}
                      oneTap
                      block
                      placeholder="Дата начала"
                    />
                    <DatePicker
                      value={endDate}
                      onChange={(v) => setEndDate(v ?? null)}
                      oneTap
                      block
                      placeholder="Дата окончания"
                    />
                  </div>
                </Field>

                <Field label="Объекты проверки (магазины, точки продаж)">
                  <Input
                    as="textarea"
                    rows={2}
                    value={inspectionObjects}
                    onChange={(v) => setInspectionObjects(String(v ?? ''))}
                    placeholder="Например: магазины “Пятёрочка” (Москва, МО), 50 точек..."
                  />
                </Field>
                <div className={styles.hint}>Распределение по АП и назначениям выполняется на странице назначения проекта.</div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Постраничный режим</div>
                      <div className={styles.hint}>Если включено, в анкете показывается один вопрос на экране, независимо от секций.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Toggle checked={isPerSectionMode} onChange={(v) => setIsPerSectionMode(Boolean(v))} />
                      <span className={styles.hint}>{isPerSectionMode ? 'По секциям' : 'По вопросам'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Нужен ли инструктаж?</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Toggle checked={hasBriefing} onChange={(v) => setHasBriefing(Boolean(v))} />
                      <span className={styles.hint}>{hasBriefing ? 'Да' : 'Нет'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {createTab === 'questions' ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div className={styles.hint}>или загрузите готовый Excel</div>
                <div className={styles.hint}>
                  Формат колонок: code, question_name, question_description, question_type, section_name, section_id
                </div>
                <div className={styles.hint}>
                  Доп. колонки для типов: answers, max_selected, rank_options, scale_min/scale_max/scale_step, scale_min_label/scale_max_label/scale_ui, table_rows/table_cols/table_mode/table_max_per_row, photo_max, dynamic_source
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button type="button" variant="secondary" onClick={downloadQuestionsTemplate}>
                    Скачать шаблон
                  </Button>
                  <Button type="button" variant="secondary" onClick={downloadQuestionsExample}>
                    Скачать пример
                  </Button>
                </div>

                <label
                  htmlFor="questions-excel-upload"
                  style={{
                    border: `1px dashed ${isQuestionsDragOver ? 'rgba(217, 162, 61, 0.8)' : 'rgba(0,0,0,0.15)'}`,
                    borderRadius: 12,
                    minHeight: 160,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    color: 'rgba(0,0,0,0.55)',
                    background: isQuestionsDragOver ? 'rgba(237, 190, 103, 0.08)' : 'transparent',
                    textAlign: 'center',
                    padding: 16,
                  }}
                  onDrop={onQuestionsDrop}
                  onDragOver={onQuestionsDragOver}
                  onDragLeave={onQuestionsDragLeave}
                >
                  <input
                    id="questions-excel-upload"
                    type="file"
                    accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={onQuestionsExcelFileChange}
                    style={{ display: 'none' }}
                  />
                  {questionsExcelFile ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,0.82)' }}>{questionsExcelFile.name}</div>
                      <div className={styles.hint}>Файл выбран. После нажатия «Создать анкету» вопросы будут импортированы.</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Кликните или перенесите сюда Excel файл</div>
                  )}
                </label>
              </div>
            ) : null}
          </div>

          {submitError ? <div className={styles.error} style={{ marginTop: 10 }}>{submitError}</div> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={closeCreate} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="button" variant="primary" onClick={submitCreate} disabled={isSubmitting}>
            Создать анкету (0 вопросов)
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function Field ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  )
}

function CreateTabButton ({
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
      onClick={onClick}
      style={{
        border: `1px solid ${isActive ? 'rgba(66, 170, 255, 0.5)' : 'rgba(0,0,0,0.2)'}`,
        background: isActive ? 'rgba(66, 170, 255, 0.12)' : 'rgba(255,255,255,0.9)',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 500,
        color: 'rgba(0,0,0,0.8)',
      }}
      aria-pressed={isActive}
    >
      {children}
    </button>
  )
}

function toDateKey (value: Date) {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function surveyDisplayId (uuid: string) {
  const hex = String(uuid || '').toLowerCase().replace(/[^0-9a-f]/g, '')
  if (!hex) return '0'
  try {
    const num = BigInt(`0x${hex}`)
    return String(Number((num % BigInt('900000')) + BigInt('100000')))
  } catch {
    return '0'
  }
}

function downloadFile (filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  link.click()
  URL.revokeObjectURL(url)
}

function formatStatus (status: SurveyStatus) {
  const map: Record<SurveyStatus, string> = {
    created: 'Черновик',
    moderation: 'На модерации',
    published: 'Опубликована',
    archived: 'Архив',
  }
  return map[status] ?? status
}

function PublishIcon () {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ModerationIcon () {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function AppIcon ({ src, alt }: { src: string; alt: string }) {
  return (
    <Image src={src} alt={alt} width={16} height={16} />
  )
}

