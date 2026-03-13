'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckPicker, Checkbox, Input, Modal } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import type {
  AddUserGroupMemberByEmailRequest,
  ReplaceUserGroupMembersRequest,
  TeamUser,
  UserGroupMembersImportResponse,
  UserGroupMembersResponse,
} from '../model/types'
import styles from './TeamGroupMembersModal.module.css'

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

export function TeamGroupMembersModal ({
  open,
  groupId,
  groupName,
  users,
  onClose,
}: {
  open: boolean
  groupId: string | null
  groupName: string | null
  users: TeamUser[]
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userIds, setUserIds] = useState<string[]>([])
  const [addEmail, setAddEmail] = useState('')
  const [replaceMode, setReplaceMode] = useState(false)
  const [importResult, setImportResult] = useState<UserGroupMembersImportResponse | null>(null)

  const options = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.lastName} ${u.firstName} · ${u.email}`,
      })),
    [users],
  )

  const selectedUsers = useMemo(() => {
    const byId = new Map(users.map((u) => [u.id, u]))
    return userIds.map((id) => byId.get(id)).filter(Boolean) as TeamUser[]
  }, [userIds, users])

  useEffect(() => {
    if (!open || !groupId) return
    let isAlive = true
    setIsLoading(true)
    setError(null)
    setImportResult(null)
    setAddEmail('')
    ;(async () => {
      try {
        const res = await axiosMainRequest.get<UserGroupMembersResponse>(apiRoutes.team.groupMembers(groupId))
        if (!isAlive) return
        setUserIds(res.data.userIds ?? [])
      } catch (err: unknown) {
        if (!isAlive) return
        setError(getApiErrorMessage(err))
        setUserIds([])
      } finally {
        if (!isAlive) return
        setIsLoading(false)
      }
    })()
    return () => {
      isAlive = false
    }
  }, [open, groupId])

  async function save () {
    if (!groupId) return
    setIsSaving(true)
    setError(null)
    try {
      const payload: ReplaceUserGroupMembersRequest = { userIds }
      const res = await axiosMainRequest.put<UserGroupMembersResponse>(apiRoutes.team.groupMembers(groupId), payload)
      setUserIds(res.data.userIds ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  async function addByEmail () {
    if (!groupId) return
    const email = addEmail.trim()
    if (!email) return
    setIsSaving(true)
    setError(null)
    try {
      const payload: AddUserGroupMemberByEmailRequest = { email }
      const res = await axiosMainRequest.post<UserGroupMembersResponse>(apiRoutes.team.groupAddByEmail(groupId), payload)
      setUserIds(res.data.userIds ?? [])
      setAddEmail('')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  async function importXlsx (file: File) {
    if (!groupId) return
    setIsSaving(true)
    setError(null)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const url = `${apiRoutes.team.groupMembersImport(groupId)}?mode=${replaceMode ? 'replace' : 'add'}`
      const res = await axiosMainRequest.post<UserGroupMembersImportResponse>(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(res.data)
      const refreshed = await axiosMainRequest.get<UserGroupMembersResponse>(apiRoutes.team.groupMembers(groupId))
      setUserIds(refreshed.data.userIds ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Участники группы{groupName ? `: ${groupName}` : ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.row}>
          <Input
            className={styles.grow}
            value={addEmail}
            onChange={(v) => setAddEmail(String(v ?? ''))}
            placeholder="Добавить по email…"
            disabled={isLoading || isSaving}
            size='sm'
          />
          <Button size='sm' type="button" variant="secondary" disabled={!addEmail.trim() || isLoading || isSaving} onClick={addByEmail}>
            Добавить
          </Button>
        </div>

        <div className={styles.row}>
          <div className={styles.pickerWrap}>
            <div className={styles.hint} style={{ marginBottom: 6 }}>Выберите участников</div>
            <CheckPicker
              data={options}
              value={userIds}
              onChange={(v) => setUserIds((v as string[]) ?? [])}
              menuStyle={{ maxHeight: 240 }}
              renderValue={(value) => {
                const count = (value as string[] | null)?.length ?? 0
                return count ? `Выбрано: ${count}` : 'Участники…'
              }}
              block
              disabled={isLoading || isSaving}
              placeholder="Участники…"
              searchable
              size='sm'
            />
            {selectedUsers.length ? (
              <div className={styles.selectedList}>
                {selectedUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={styles.selectedTag}
                    onClick={() => setUserIds((prev) => prev.filter((id) => id !== u.id))}
                    disabled={isSaving}
                    title="Удалить из группы"
                  >
                    <span className={styles.selectedTagText}>{u.lastName} {u.firstName}</span>
                    <span className={styles.selectedTagClose} aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.importLine}>
          <input
            ref={fileRef}
            className={styles.fileInput}
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              importXlsx(f)
            }}
          />
          <Button type="button" variant="ghost" disabled={isSaving} onClick={() => fileRef.current?.click()}>
            Импорт .xlsx (email)
          </Button>
          <Checkbox checked={replaceMode} onChange={(_, checked) => setReplaceMode(Boolean(checked))} disabled={isSaving}>
            Заменить участников
          </Checkbox>
        </div>

        {importResult ? (
          <>
            <div className={styles.result}>
              Добавлено: {importResult.added}, пропущено: {importResult.skipped}
            </div>
            {importResult.errors?.length ? (
              <div className={styles.resultError}>
                {importResult.errors.slice(0, 50).map((e, idx) => (
                  <div key={`${e.row}-${idx}`}>
                    <span className={styles.mono}>row {e.row}</span> — {e.message}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footer}>
          <Button size='sm' type="button" variant="ghost" disabled={isSaving} onClick={onClose}>
            Закрыть
          </Button>
          <Button size='sm' type="button" variant="primary" disabled={isSaving} onClick={save}>
            {isSaving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

