'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, Modal, SelectPicker } from 'rsuite'
import { useRouter } from 'next/navigation'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { SurveyCategory, SurveyCreateResponse, SurveyResponse, SurveysResponse, SurveyItem, SurveyStatus } from '@/entities/survey'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import styles from './SurveyBuilderPage.module.css'

const categoryOptions: Array<{ value: SurveyCategory; label: string; disabled?: boolean }> = [
  { value: 'price_monitoring', label: 'Ценовой мониторинг' },
  { value: 'mystery', label: 'Мистери (скоро)', disabled: true },
]

const statusOptions: Array<{ value: SurveyStatus | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'created', label: 'Создана' },
  { value: 'moderation', label: 'На модерации' },
  { value: 'published', label: 'Опубликована' },
  { value: 'archived', label: 'Архив' },
]

export function SurveyBuilderPage () {
  const router = useRouter()

  const [surveys, setSurveys] = useState<SurveyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | ''>('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createTitle, setCreateTitle] = useState('')
  const [createCategory, setCreateCategory] = useState<SurveyCategory>('price_monitoring')

  const [deleteSurveyId, setDeleteSurveyId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [actionSurveyId, setActionSurveyId] = useState<string | null>(null)

  const hasFilters = useMemo(() => search.trim().length > 0 || statusFilter !== '', [search, statusFilter])

  async function loadSurveys (opts?: { q?: string; status?: SurveyStatus | '' }) {
    setIsLoading(true)
    setError(null)
    try {
      const q = (opts?.q ?? search).trim()
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
      loadSurveys({ q: search, status: statusFilter })
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  const isNoResults = !isLoading && !error && surveys.length === 0 && hasFilters

  function openCreate () {
    setIsCreateOpen(true)
    setSubmitError(null)
    setCreateTitle('')
    setCreateCategory('price_monitoring')
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
        category: createCategory,
      })
      const createdId = res.data?.survey?.id
      await loadSurveys()
      closeCreate()
      if (createdId) {
        router.push(`/survey/${encodeURIComponent(createdId)}`)
      }
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
          +
        </button>
      </div>

      <div className={styles.subTitle}>
        Список анкет вашей компании. Выберите анкету для редактирования.
      </div>

      {deleteError ? <div className={styles.error}>{deleteError}</div> : null}

      <div className={styles.filters}>
        <Input
          size="sm"
          className={styles.input}
          value={search}
          onChange={(value) => setSearch(String(value ?? ''))}
          placeholder="Поиск по названию…"
          aria-label="Поиск"
        />
        <SelectPicker
          size="sm"
          value={statusFilter}
          onChange={(v) => setStatusFilter((v as SurveyStatus | '') ?? '')}
          data={statusOptions}
          placeholder="Статус"
          cleanable={false}
          searchable={false}
          style={{ minWidth: 160 }}
        />
      </div>

      {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {isNoResults ? <div className={styles.hint}>Ничего не найдено</div> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Название</th>
              <th className={styles.th}>Статус</th>
              <th className={styles.th}>Создана</th>
              <th className={styles.th} style={{ width: 180 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((s) => (
              <tr key={s.id}>
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
                        <ArchiveIcon />
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
                        <UnarchiveIcon />
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Редактировать"
                      onClick={() => openEditor(s.id)}
                      disabled={deleteSurveyId === s.id}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                      aria-label="Удалить"
                      disabled={deleteSurveyId === s.id}
                      onClick={() => submitDelete(s)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {surveys.length === 0 && !isLoading ? (
              <tr>
                <td className={styles.td} colSpan={4}>
                  Анкеты не найдены
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={isCreateOpen} onClose={closeCreate} size="sm">
        <Modal.Header>
          <Modal.Title>Новая анкета</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Название *">
              <Input value={createTitle} onChange={(v) => setCreateTitle(String(v ?? ''))} placeholder="Например: Мониторинг цен · март" />
            </Field>
            <Field label="Категория *">
              <SelectPicker
                value={createCategory}
                onChange={(v) => setCreateCategory((v as SurveyCategory) ?? 'price_monitoring')}
                cleanable={false}
                searchable={false}
                block
                data={categoryOptions}
                placeholder="Выберите категорию"
              />
            </Field>
          </div>

          {submitError ? <div className={styles.error} style={{ marginTop: 10 }}>{submitError}</div> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={closeCreate} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="button" variant="primary" onClick={submitCreate} disabled={isSubmitting}>
            Создать
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function Field ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
      {children}
    </div>
  )
}

function formatStatus (status: SurveyStatus) {
  const map: Record<SurveyStatus, string> = {
    created: 'Создана',
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

function ArchiveIcon () {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UnarchiveIcon () {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 8v13H3V8M1 3h22v5H1zM12 12v6M9 15l3 3 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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

