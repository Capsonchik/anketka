import { useEffect, useMemo, useState } from 'react'
import { Input, Modal, SelectPicker } from 'rsuite'
import { useRouter } from 'next/navigation'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { SurveyCreateResponse, SurveysResponse, SurveyItem, ProjectSurveysResponse } from '@/entities/survey'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../../lib/getApiErrorMessage'
import styles from '../ProjectPage.module.css'

export function ProjectSurveysTab ({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [attached, setAttached] = useState<SurveyItem[]>([])
  const [attachedError, setAttachedError] = useState<string | null>(null)
  const [isAttachedLoading, setIsAttachedLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [all, setAll] = useState<SurveyItem[]>([])
  const [allError, setAllError] = useState<string | null>(null)
  const [isAllLoading, setIsAllLoading] = useState(false)

  const [q, setQ] = useState('')
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')

  async function loadAttached () {
    setIsAttachedLoading(true)
    setAttachedError(null)
    try {
      const res = await axiosMainRequest.get<ProjectSurveysResponse>(apiRoutes.projects.projectSurveys(projectId))
      setAttached(res.data.items ?? [])
    } catch (err: unknown) {
      setAttached([])
      setAttachedError(getApiErrorMessage(err))
    } finally {
      setIsAttachedLoading(false)
    }
  }

  async function loadAll (opts?: { q?: string }) {
    setIsAllLoading(true)
    setAllError(null)
    try {
      const res = await axiosMainRequest.get<SurveysResponse>(apiRoutes.surveys.surveys, { params: { q: (opts?.q ?? '').trim() || undefined } })
      setAll(res.data.items ?? [])
    } catch (err: unknown) {
      setAll([])
      setAllError(getApiErrorMessage(err))
    } finally {
      setIsAllLoading(false)
    }
  }

  useEffect(() => {
    loadAttached()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const attachedIds = useMemo(() => new Set(attached.map((x) => x.id)), [attached])

  const selectOptions = useMemo(() => {
    return all.map((s) => ({
      value: s.id,
      label: attachedIds.has(s.id) ? `${formatCategory(s.category)} · ${s.title} (уже в проекте)` : `${formatCategory(s.category)} · ${s.title}`,
      disabled: attachedIds.has(s.id),
    }))
  }, [all, attachedIds])

  async function openModal () {
    setIsModalOpen(true)
    setModalError(null)
    setSelectedSurveyId(null)
    setNewTitle('')
    setQ('')
    await loadAll()
  }

  async function attachSelected () {
    if (!selectedSurveyId) return
    setIsSubmitting(true)
    setModalError(null)
    try {
      await axiosMainRequest.post(apiRoutes.projects.projectSurveys(projectId), { surveyId: selectedSurveyId })
      await loadAttached()
      setIsModalOpen(false)
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function createAndAttach () {
    const title = newTitle.trim()
    if (!title) return
    setIsSubmitting(true)
    setModalError(null)
    try {
      const created = await axiosMainRequest.post<SurveyCreateResponse>(apiRoutes.surveys.surveys, { title, category: 'price_monitoring' })
      const surveyId = created.data?.survey?.id
      if (!surveyId) {
        setModalError('Не удалось создать анкету')
        return
      }
      await axiosMainRequest.post(apiRoutes.projects.projectSurveys(projectId), { surveyId })
      await loadAttached()
      setIsModalOpen(false)
      router.push(`/survey/${encodeURIComponent(surveyId)}?projectId=${encodeURIComponent(projectId)}`)
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function copyTestLink (surveyId: string) {
    try {
      const res = await axiosMainRequest.post<{ invite: { token: string } }>(apiRoutes.projects.projectSurveyTestInvite(projectId, surveyId))
      const token = res.data?.invite?.token
      if (!token) return
      const url = `${window.location.origin}/pa?token=${encodeURIComponent(token)}`
      await navigator.clipboard.writeText(url)
    } catch (err: unknown) {
      setAttachedError(getApiErrorMessage(err))
    }
  }

  async function detach (surveyId: string) {
    const ok = window.confirm('Открепить анкету от проекта?')
    if (!ok) return
    setIsSubmitting(true)
    setAttachedError(null)
    try {
      await axiosMainRequest.delete(apiRoutes.projects.projectSurvey(projectId, surveyId))
      await loadAttached()
    } catch (err: unknown) {
      setAttachedError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.tabPanel}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Анкеты проекта</div>
          <Button type="button" variant="primary" onClick={openModal} disabled={isSubmitting}>
            Добавить анкету
          </Button>
        </div>

        {isAttachedLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {attachedError ? <div className={styles.error}>{attachedError}</div> : null}

        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th className={styles.th}>Категория</th>
                <th className={styles.th}>Название</th>
                <th className={styles.th}>Создана</th>
                <th className={styles.th} style={{ width: 56 }} />
                <th className={styles.th} style={{ width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {attached.map((s) => (
                <tr key={s.id}>
                  <td className={styles.td}>{formatCategory(s.category)}</td>
                  <td className={styles.tdWrap}>{s.title}</td>
                  <td className={styles.td}>{String(s.createdAt).slice(0, 10)}</td>
                  <td className={styles.td}>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Скопировать ссылку"
                        title="Скопировать ссылку"
                        disabled={isSubmitting}
                        onClick={() => copyTestLink(s.id)}
                      >
                        <LinkIcon />
                      </button>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                        aria-label="Открепить"
                        disabled={isSubmitting}
                        onClick={() => detach(s.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {attached.length === 0 && !isAttachedLoading ? (
                <tr>
                  <td className={styles.td} colSpan={5}>Анкеты не прикреплены</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        <Modal.Header>
          <Modal.Title>Добавить анкету в проект</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className={styles.hint}>
            Можно выбрать существующую анкету или создать новую (пока без конструктора — только название).
          </div>

          <div className={styles.formRow} style={{ marginTop: 10 }}>
            <Input
              value={q}
              onChange={(v) => setQ(String(v ?? ''))}
              placeholder="Поиск по анкетам…"
              style={{ flex: 1, minWidth: 220 }}
            />
            <Button type="button" variant="secondary" onClick={() => loadAll({ q })} disabled={isAllLoading || isSubmitting}>
              Найти
            </Button>
          </div>

          {allError ? <div className={styles.error} style={{ marginTop: 10 }}>{allError}</div> : null}

          <div className={styles.formRow} style={{ marginTop: 10 }}>
            <SelectPicker
              value={selectedSurveyId}
              onChange={(v) => setSelectedSurveyId((v as string | null) ?? null)}
              cleanable
              searchable
              block
              data={selectOptions}
              placeholder="Выберите анкету"
            />
          </div>

          <div className={styles.formRow} style={{ marginTop: 10 }}>
            <Button type="button" variant="primary" onClick={attachSelected} disabled={!selectedSurveyId || isSubmitting}>
              Прикрепить
            </Button>
          </div>

          <div className={styles.hint} style={{ marginTop: 14 }}>Создать новую:</div>
          <div className={styles.formRow} style={{ marginTop: 8 }}>
            <Input
              value={newTitle}
              onChange={(v) => setNewTitle(String(v ?? ''))}
              placeholder="Название анкеты"
              style={{ flex: 1, minWidth: 220 }}
            />
            <Button type="button" variant="primary" onClick={createAndAttach} disabled={isSubmitting || newTitle.trim().length === 0}>
              Создать и прикрепить
            </Button>
          </div>

          {modalError ? <div className={styles.error} style={{ marginTop: 10 }}>{modalError}</div> : null}
        </Modal.Body>
      </Modal>
    </div>
  )
}

function formatCategory (category: SurveyItem['category']) {
  if (category === 'mystery') return 'Мистери'
  return 'Ценовой мониторинг'
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

function LinkIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

