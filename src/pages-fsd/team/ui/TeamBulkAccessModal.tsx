'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckPicker, Input, Modal, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { ProjectsResponse, ProjectItem } from '@/pages-fsd/projects/model/types'
import type { RefRegionItem, RefRegionsResponse } from '@/pages-fsd/project/model/types'
import { Button } from '@/shared/ui'

import type { BulkAssignRequest, BulkAssignResponse, TeamUser } from '../model/types'

import styles from './TeamBulkAccessModal.module.css'

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

export function TeamBulkAccessModal ({
  open,
  onClose,
  users,
  canEdit,
  onDone,
}: {
  open: boolean
  onClose: () => void
  users: TeamUser[]
  canEdit: boolean
  onDone: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [regions, setRegions] = useState<RefRegionItem[]>([])

  const [projectId, setProjectId] = useState<string | null>(null)
  const [accessRole, setAccessRole] = useState<'controller' | 'coordinator'>('controller')
  const [regionCodes, setRegionCodes] = useState<string[]>([])

  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const projectOptions = useMemo(() => projects.map((p) => ({ value: p.id, label: p.name })), [projects])
  const regionOptions = useMemo(
    () => [{ value: '*', label: 'Все регионы' }, ...regions.map((r) => ({ value: r.code, label: `${r.code} · ${r.name}` }))],
    [regions],
  )

  useEffect(() => {
    if (!open) return
    let isAlive = true
    setIsLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          axiosMainRequest.get<ProjectsResponse>(apiRoutes.projects.projects),
          axiosMainRequest.get<RefRegionsResponse>(apiRoutes.projects.refRegions),
        ])
        if (!isAlive) return
        setProjects(pRes.data.items ?? [])
        setRegions(rRes.data.items ?? [])
      } catch (err: unknown) {
        if (!isAlive) return
        setError(getApiErrorMessage(err))
        setProjects([])
        setRegions([])
      } finally {
        if (!isAlive) return
        setIsLoading(false)
      }
    })()
    return () => {
      isAlive = false
    }
  }, [open])

  const filteredUsers = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return users
    return users.filter((u) => {
      const hay = [u.firstName, u.lastName, u.email, u.phone ?? ''].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(query)
    })
  }, [q, users])

  const selectedIds = useMemo(() => Array.from(selected), [selected])

  async function submit () {
    if (!projectId) return
    if (!selectedIds.length) return
    setIsSubmitting(true)
    setError(null)
    try {
      const payload: BulkAssignRequest = {
        userIds: selectedIds,
        projectId,
        accessRole,
        regionCodes: regionCodes.includes('*') ? ['*'] : regionCodes,
      }
      await axiosMainRequest.post<BulkAssignResponse>(apiRoutes.team.bulkProjectAccess, payload)
      onDone()
      onClose()
      setSelected(new Set())
      setQ('')
      setProjectId(null)
      setRegionCodes([])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Массовое назначение (проект + регионы)</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.formRow}>
          <div>
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
          <div>
            <div className={styles.label}>Роль</div>
            <SelectPicker
              value={accessRole}
              onChange={(v) => setAccessRole(((v as 'controller' | 'coordinator') ?? 'controller'))}
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
          <div>
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
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <Input
            value={q}
            onChange={(v) => setQ(String(v ?? ''))}
            placeholder="Поиск по ФИО/почте/телефону…"
            style={{ flex: 1, minWidth: 260 }}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={!filteredUsers.length}
            onClick={() => {
              setSelected((prev) => {
                const visibleIds = filteredUsers.map((u) => u.id)
                const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))
                const next = new Set(prev)
                if (allSelected) {
                  for (const id of visibleIds) next.delete(id)
                } else {
                  for (const id of visibleIds) next.add(id)
                }
                return next
              })
            }}
          >
            Выбрать/снять всё
          </Button>
        </div>

        <div className={styles.usersList}>
          {filteredUsers.map((u) => (
            <div key={u.id} className={styles.userRow}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (next.has(u.id)) next.delete(u.id)
                      else next.add(u.id)
                      return next
                    })
                  }
                />
                <span className={styles.userName}>{u.lastName} {u.firstName}</span>
              </label>
              <span className={styles.userMeta}>{u.email}</span>
            </div>
          ))}
          {filteredUsers.length === 0 ? <div className={styles.hint}>Пользователи не найдены</div> : null}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footer}>
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" variant="primary" disabled={!canEdit || isSubmitting || !projectId || selectedIds.length === 0} onClick={submit}>
            {isSubmitting ? 'Назначение…' : `Назначить (${selectedIds.length})`}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

