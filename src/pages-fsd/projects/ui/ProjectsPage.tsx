'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { UserRole } from '@/entities/user'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import type { CreateProjectResponse, ProjectsResponse, TeamUsersResponse, ProjectItem, TeamUserItem, MeResponse } from '../model/types'
import { ProjectCreateModal, type CreateProjectFormState } from './ProjectCreateModal'
import { ProjectCard } from './ProjectCard'
import styles from './ProjectsPage.module.css'

function toIsoDate (date: Date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function ProjectsPage () {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [myRole, setMyRole] = useState<UserRole | null>(null)

  const [search, setSearch] = useState('')

  const [managers, setManagers] = useState<TeamUserItem[]>([])
  const [managersError, setManagersError] = useState<string | null>(null)

  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState<CreateProjectFormState>({
    name: '',
    comment: '',
    startDate: null,
    endDate: null,
    managerId: null,
    addressbookMode: 'none',
    addressbookFile: null,
    addressbookSourceProjectId: null,
  })

  const hasFilters = useMemo(() => search.trim().length > 0, [search])

  function closeModal () {
    setIsModalOpen(false)
    setSubmitError(null)
    setSubmitSuccess(null)
    setCreateForm({
      name: '',
      comment: '',
      startDate: null,
      endDate: null,
      managerId: null,
      addressbookMode: 'none',
      addressbookFile: null,
      addressbookSourceProjectId: null,
    })
  }

  async function loadProjects (opts?: { q?: string }) {
    setIsLoading(true)
    setError(null)
    try {
      const q = (opts?.q ?? search).trim()
      const params: Record<string, string> = {}
      if (q) params.q = q
      const res = await axiosMainRequest.get<ProjectsResponse>(apiRoutes.projects.projects, { params })
      setProjects(res.data.items ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadManagers () {
    setManagersError(null)
    try {
      const res = await axiosMainRequest.get<TeamUsersResponse>(apiRoutes.team.users)
      setManagers(res.data.items ?? [])
    } catch (err: unknown) {
      setManagers([])
      setManagersError(getApiErrorMessage(err))
    }
  }

  async function loadMe () {
    try {
      const res = await axiosMainRequest.get<MeResponse>(apiRoutes.users.me)
      setMyRole(res.data.role ?? null)
    } catch {
      setMyRole(null)
    }
  }

  useEffect(() => {
    loadMe()
    loadManagers()
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadProjects({ q: search })
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const isEmpty = !isLoading && !error && projects.length === 0 && !hasFilters
  const isNoResults = !isLoading && !error && projects.length === 0 && hasFilters

  const isAdmin = myRole === 'admin'

  async function submitDelete (project: ProjectItem) {
    if (!isAdmin) return
    setDeleteError(null)

    const ok = window.confirm(`Удалить проект «${project.name}»? Данные проекта будут удалены без возможности восстановления.`)
    if (!ok) return

    setDeleteProjectId(project.id)
    try {
      await axiosMainRequest.delete(apiRoutes.projects.project(project.id))
      await loadProjects()
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err))
    } finally {
      setDeleteProjectId(null)
    }
  }

  async function submitCreate () {
    setSubmitError(null)
    setSubmitSuccess(null)

    const name = createForm.name.trim()
    const managerId = createForm.managerId
    const startDate = createForm.startDate
    const endDate = createForm.endDate

    if (!name || !managerId || !startDate || !endDate) {
      setSubmitError('Заполните обязательные поля')
      return
    }

    if (startDate.getTime() > endDate.getTime()) {
      setSubmitError('Дата окончания должна быть не раньше даты начала')
      return
    }

    if (createForm.addressbookMode === 'uploadNew' && !createForm.addressbookFile) {
      setSubmitError('Выберите файл Excel для справочника')
      return
    }

    if (createForm.addressbookMode === 'fromProject' && !createForm.addressbookSourceProjectId) {
      setSubmitError('Выберите проект-источник')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await axiosMainRequest.post<CreateProjectResponse>(apiRoutes.projects.projects, {
        name,
        comment: createForm.comment.trim() || null,
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
        managerId,
      })

      const projectId = res.data?.project?.id
      if (!projectId) {
        setSubmitError('Не удалось создать проект')
        return
      }

      if (createForm.addressbookMode === 'uploadNew' && createForm.addressbookFile) {
        const fd = new FormData()
        fd.append('file', createForm.addressbookFile)
        await axiosMainRequest.post(apiRoutes.projects.addressbookUpload(projectId), fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      if (createForm.addressbookMode === 'fromProject' && createForm.addressbookSourceProjectId) {
        await axiosMainRequest.post(apiRoutes.projects.addressbookClone(projectId), {
          sourceProjectId: createForm.addressbookSourceProjectId,
        })
      }

      await loadProjects()
      setSubmitSuccess('Создано')
      closeModal()
    } catch (err: unknown) {
      setSubmitError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className="titleH1">Проекты</h1>
        <button
          type="button"
          className={styles.addIconButton}
          aria-label="Добавить проект"
          onClick={() => {
            setSubmitError(null)
            setSubmitSuccess(null)
            setIsModalOpen(true)
          }}
        >
          <img src="/icons/add.svg" width={18} height={18} alt="" aria-hidden="true" />
        </button>
      </div>

      <div className={styles.subTitle}>Создавайте и управляйте проектами, сроками и ответственными.</div>

      {managersError ? <div className={styles.hint}>Менеджеры: {managersError}</div> : null}
      {deleteError ? <div className={styles.error}>Удаление: {deleteError}</div> : null}

      {isEmpty ? (
        <div className={styles.emptyState}>
          <Button type="button" variant="primary" onClick={() => setIsModalOpen(true)}>
            Добавить проект
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.filters}>
            <Input
              size='sm'
              className={styles.input}
              value={search}
              onChange={(value) => setSearch(String(value ?? ''))}
              placeholder="Поиск по названию…"
              aria-label="Поиск"
            />
          </div>

          {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}
          {isNoResults ? <div className={styles.hint}>Ничего не найдено</div> : null}

          <div className={styles.list}>
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isAdmin={isAdmin}
                isDeleting={deleteProjectId === p.id}
                onDelete={() => submitDelete(p)}
              />
            ))}
          </div>
        </>
      )}

      <ProjectCreateModal
        open={isModalOpen}
        onClose={closeModal}
        isSubmitting={isSubmitting}
        submitError={submitError}
        submitSuccess={submitSuccess}
        form={createForm}
        managers={managers}
        projects={projects}
        onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submitCreate}
      />
    </div>
  )
}

