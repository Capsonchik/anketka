'use client'

import Image from 'next/image'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Input, Modal } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button, PageLoader } from '@/shared/ui'

import type { CreateUserGroupRequest, TeamUser, UpdateUserGroupRequest, UserGroupItem, UserGroupsResponse } from '../model/types'
import { TeamGroupMembersModal } from './TeamGroupMembersModal'
import styles from './TeamGroupsTab.module.css'

function fmtDt (value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return new Intl.DateTimeFormat('ru-RU', { year: '2-digit', month: '2-digit', day: '2-digit' }).format(d)
}

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

export type TeamGroupsTabHandle = {
  openCreate: () => void
}

type Props = {
  active: boolean
  users: TeamUser[]
  canManage: boolean
}

export const TeamGroupsTab = forwardRef<TeamGroupsTabHandle, Props>(function TeamGroupsTab (
  {
    active,
    users,
    canManage,
  }: Props,
  ref,
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<UserGroupItem[]>([])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [membersGroupId, setMembersGroupId] = useState<string | null>(null)
  const [membersGroupName, setMembersGroupName] = useState<string | null>(null)
  const [isMembersOpen, setIsMembersOpen] = useState(false)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter((x) => x.name.toLowerCase().includes(s))
  }, [items, q])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await axiosMainRequest.get<UserGroupsResponse>(apiRoutes.team.groups)
      setItems(res.data.items ?? [])
    } catch (err: unknown) {
      setItems([])
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    load()
  }, [active, load])

  useImperativeHandle(
    ref,
    () => ({
      openCreate: () => {
        if (!canManage) return
        setError(null)
        setCreateName('')
        setIsCreateOpen(true)
      },
    }),
    [canManage],
  )

  async function create () {
    const name = createName.trim()
    if (!name) return
    setIsSubmitting(true)
    setError(null)
    try {
      const payload: CreateUserGroupRequest = { name }
      await axiosMainRequest.post(apiRoutes.team.groups, payload)
      setCreateName('')
      setIsCreateOpen(false)
      await load()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function rename (group: UserGroupItem) {
    const next = window.prompt('Новое название группы', group.name)
    if (!next) return
    setError(null)
    try {
      const payload: UpdateUserGroupRequest = { name: next }
      await axiosMainRequest.patch(apiRoutes.team.group(group.id), payload)
      await load()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    }
  }

  async function remove (group: UserGroupItem) {
    if (!window.confirm('Удалить группу?')) return
    setError(null)
    try {
      await axiosMainRequest.delete(apiRoutes.team.group(group.id))
      await load()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <>
      <div className={styles.headerRow}>
        <div className={styles.search}>
          <Input value={q} onChange={(v) => setQ(String(v ?? ''))} placeholder="Поиск группы…" />
        </div>
      </div>

      {isLoading ? <PageLoader centered size="lg" /> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      {filtered.length ? (
        <div className={styles.wrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Группа</th>
                <th>Участников</th>
                <th>Создана</th>
                <th className={styles.actionsCol} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id}>
                  <td className={styles.name}>{g.name}</td>
                  <td className={styles.meta}>{g.membersCount}</td>
                  <td className={styles.meta}>{fmtDt(g.createdAt)}</td>
                  <td className={styles.actions}>
                    <IconButton
                      label="Участники"
                      iconSrc="/icons/user.svg"
                      disabled={!canManage}
                      onClick={() => {
                        setMembersGroupId(g.id)
                        setMembersGroupName(g.name)
                        setIsMembersOpen(true)
                      }}
                    />
                    <IconButton label="Переименовать" iconSrc="/icons/edit.svg" disabled={!canManage} onClick={() => rename(g)} />
                    <IconButton label="Удалить" iconSrc="/icons/trash.svg" disabled={!canManage} onClick={() => remove(g)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !isLoading ? (
        <div className={styles.hintCenter}>Групп пока нет</div>
      ) : null}

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} size="sm">
        <Modal.Header>
          <Modal.Title>Новая группа</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Input value={createName} onChange={(v) => setCreateName(String(v ?? ''))} placeholder="Название…" />
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => setIsCreateOpen(false)}>
            Отмена
          </Button>
          <Button type="button" variant="primary" disabled={isSubmitting || !createName.trim()} onClick={create}>
            Создать
          </Button>
        </Modal.Footer>
      </Modal>

      <TeamGroupMembersModal
        open={isMembersOpen}
        groupId={membersGroupId}
        groupName={membersGroupName}
        users={users}
        onClose={() => {
          setIsMembersOpen(false)
          setMembersGroupId(null)
          setMembersGroupName(null)
          load()
        }}
      />
    </>
  )
})

function IconButton ({
  label,
  iconSrc,
  disabled,
  onClick,
}: {
  label: string
  iconSrc: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Image src={iconSrc} alt="" width={16} height={16} aria-hidden="true" />
    </button>
  )
}

