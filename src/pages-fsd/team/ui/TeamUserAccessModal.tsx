'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckPicker, Modal, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'

import type { ProjectsResponse, ProjectItem } from '@/pages-fsd/projects/model/types'
import type { RefRegionsResponse, RefRegionItem } from '@/pages-fsd/project/model/types'
import { Button, PageLoader } from '@/shared/ui'

import type { UserProjectAccessItem, UserProjectAccessReplaceRequest, UserProjectAccessResponse } from '../model/types'

import styles from './TeamUserAccessModal.module.css'

function getApiErrorMessage (err: unknown): string {
  if (typeof err === 'object' && err) {
    const response = (err as { response?: unknown }).response
    if (typeof response === 'object' && response) {
      const data = (response as { data?: unknown }).data
      const detail = (data as { detail?: unknown } | undefined)?.detail
      if (typeof detail === 'string' && detail.trim()) return detail
    }
  }
  if (err instanceof Error && err.message) return err.message
  return 'Ошибка запроса'
}

function accessRoleLabel (role: UserProjectAccessItem['accessRole']) {
  if (role === 'controller') return 'Контролер'
  return 'Координатор'
}

export function TeamUserAccessModal ({
  open,
  userId,
  onClose,
  canEdit,
}: {
  open: boolean
  userId: string | null
  onClose: () => void
  canEdit: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [regions, setRegions] = useState<RefRegionItem[]>([])
  const [items, setItems] = useState<UserProjectAccessItem[]>([])

  const [projectId, setProjectId] = useState<string | null>(null)
  const [accessRole, setAccessRole] = useState<UserProjectAccessItem['accessRole']>('controller')
  const [regionCodes, setRegionCodes] = useState<string[]>([])

  const projectOptions = useMemo(() => projects.map((p) => ({ value: p.id, label: p.name })), [projects])
  const regionOptions = useMemo(
    () => [{ value: '*', label: 'Все регионы' }, ...regions.map((r) => ({ value: r.code, label: `${r.code} · ${r.name}` }))],
    [regions],
  )

  useEffect(() => {
    if (!open || !userId) return
    let isAlive = true
    setIsLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [pRes, rRes, aRes] = await Promise.all([
          axiosMainRequest.get<ProjectsResponse>(apiRoutes.projects.projects),
          axiosMainRequest.get<RefRegionsResponse>(apiRoutes.projects.refRegions),
          axiosMainRequest.get<UserProjectAccessResponse>(apiRoutes.team.userProjectAccess(userId)),
        ])
        if (!isAlive) return
        setProjects(pRes.data.items ?? [])
        setRegions(rRes.data.items ?? [])
        setItems(aRes.data.items ?? [])
      } catch (err: unknown) {
        if (!isAlive) return
        setError(getApiErrorMessage(err))
        setProjects([])
        setRegions([])
        setItems([])
      } finally {
        if (!isAlive) return
        setIsLoading(false)
      }
    })()

    return () => {
      isAlive = false
    }
  }, [open, userId])

  function upsertItem (next: UserProjectAccessItem) {
    setItems((prev) => {
      const filtered = prev.filter((x) => x.projectId !== next.projectId)
      return [...filtered, next]
    })
  }

  function removeItem (pid: string) {
    setItems((prev) => prev.filter((x) => x.projectId !== pid))
  }

  async function save () {
    if (!userId) return
    setIsSaving(true)
    setError(null)
    try {
      const payload: UserProjectAccessReplaceRequest = { items }
      const res = await axiosMainRequest.put<UserProjectAccessResponse>(apiRoutes.team.userProjectAccess(userId), payload)
      setItems(res.data.items ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  const sorted = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p.name]))
    return [...items].sort((a, b) => String(byId.get(a.projectId) ?? a.projectId).localeCompare(String(byId.get(b.projectId) ?? b.projectId)))
  }, [items, projects])

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Доступы пользователя</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <div className={styles.loadingWrap}>
            <PageLoader centered size="lg" />
          </div>
        ) : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.addRow}>
          <div className={styles.row} style={{ marginBottom: 0 }}>
            <div className={styles.label}>Проект</div>
            <SelectPicker
              value={projectId}
              onChange={(v) => setProjectId((v as string | null) ?? null)}
              data={projectOptions}
              cleanable
              searchable
              block
              placeholder="Выберите проект"
              disabled={isLoading || !canEdit}
            />
          </div>

          <div className={styles.row} style={{ marginBottom: 0 }}>
            <div className={styles.label}>Роль</div>
            <SelectPicker
              value={accessRole}
              onChange={(v) => setAccessRole(((v as UserProjectAccessItem['accessRole']) ?? 'controller'))}
              data={[
                { value: 'controller', label: 'Контролер' },
                { value: 'coordinator', label: 'Координатор' },
              ]}
              cleanable={false}
              searchable={false}
              block
              disabled={isLoading || !canEdit}
            />
          </div>

          <div className={styles.row} style={{ marginBottom: 0 }}>
            <div className={styles.label}>Регионы</div>
            <CheckPicker
              value={regionCodes}
              onChange={(v) => setRegionCodes((v as string[]) ?? [])}
              data={regionOptions}
              block
              placeholder="Выберите регионы"
              disabled={isLoading || !canEdit}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={!canEdit || isLoading || !projectId}
            onClick={() => {
              if (!projectId) return
              const normalized = regionCodes.includes('*') ? ['*'] : regionCodes
              upsertItem({ projectId, accessRole, regionCodes: normalized })
              setProjectId(null)
              setRegionCodes([])
            }}
          >
            Добавить
          </Button>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Проект</th>
              <th className={styles.th}>Роль</th>
              <th className={styles.th}>Регионы</th>
              <th className={styles.th} style={{ width: 110 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((x) => {
              const projectName = projects.find((p) => p.id === x.projectId)?.name ?? x.projectId
              const regionsLabel = x.regionCodes.includes('*') ? 'Все' : (x.regionCodes.length ? x.regionCodes.join(', ') : '—')
              return (
                <tr key={`${x.projectId}`}>
                  <td className={styles.td}>{projectName}</td>
                  <td className={styles.td}>{accessRoleLabel(x.accessRole)}</td>
                  <td className={[styles.td, styles.tdMono].join(' ')}>{regionsLabel}</td>
                  <td className={styles.td}>
                    <Button type="button" variant="ghost" disabled={!canEdit} onClick={() => removeItem(x.projectId)}>
                      Удалить
                    </Button>
                  </td>
                </tr>
              )
            })}
            {!sorted.length && !isLoading ? (
              <tr>
                <td className={styles.td} colSpan={4}>Назначений нет</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footer}>
          <Button type="button" variant="ghost" disabled={isSaving} onClick={onClose}>
            Закрыть
          </Button>
          <Button type="button" variant="primary" disabled={!canEdit || isSaving} onClick={save}>
            {isSaving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

