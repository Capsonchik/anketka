'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal, Radio, RadioGroup, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import type { CloneUserMode, CloneUserRequest, CloneUserResponse, TeamUser, TeamUsersResponse } from '../model/types'

import styles from './TeamUserCloneModal.module.css'

const cloneModeOptions: Array<{ value: CloneUserMode; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'role_groups', label: 'Роли и группы' },
  { value: 'distribution', label: 'Клиенты/локации' },
  { value: 'reports', label: 'Отчёты' },
]

function toUserLabel (u: TeamUser) {
  const fio = `${u.firstName} ${u.lastName}`.trim()
  return fio ? `${fio} · ${u.email}` : u.email
}

export function TeamUserCloneModal ({
  open,
  onClose,
  targetUserId,
}: {
  open: boolean
  onClose: () => void
  targetUserId: string
}) {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<TeamUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sourceUserId, setSourceUserId] = useState<string | null>(null)
  const [mode, setMode] = useState<CloneUserMode>('all')
  const [result, setResult] = useState<CloneUserResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function reset () {
    setQ('')
    setUsers([])
    setError(null)
    setSourceUserId(null)
    setMode('all')
    setResult(null)
    setIsSubmitting(false)
    setIsLoading(false)
  }

  function handleClose () {
    reset()
    onClose()
  }

  const data = useMemo(() => {
    return users
      .filter((u) => u.id !== targetUserId)
      .map((u) => ({
        value: u.id,
        label: toUserLabel(u),
      }))
  }, [users, targetUserId])

  useEffect(() => {
    if (!open) return
    let isAlive = true
    const t = window.setTimeout(() => {
      const params: Record<string, string> = {}
      if (q.trim()) params.q = q.trim()
      setIsLoading(true)
      setError(null)
      axiosMainRequest
        .get<TeamUsersResponse>(apiRoutes.team.users, { params })
        .then((res) => {
          if (!isAlive) return
          setUsers(res.data.items ?? [])
        })
        .catch((err: unknown) => {
          if (!isAlive) return
          setUsers([])
          setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей')
        })
        .finally(() => {
          if (!isAlive) return
          setIsLoading(false)
        })
    }, 250)
    return () => {
      isAlive = false
      window.clearTimeout(t)
    }
  }, [open, q])

  return (
    <Modal open={open} onClose={handleClose} size="sm" onEntered={reset}>
      <Modal.Header>
        <Modal.Title>Клонирование настроек</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.body}>
          {error ? <div className={styles.error}>{error}</div> : null}

          <div className={styles.row}>
            <div className={styles.label}>Пользователь-источник</div>
            <SelectPicker
              data={data}
              value={sourceUserId}
              onChange={(v) => setSourceUserId((v as string | null) ?? null)}
              onSearch={(next) => setQ(String(next ?? ''))}
              placeholder="Начните вводить ФИО или email…"
              block
              searchable
              cleanable
              loading={isLoading}
            />
            <div className={styles.hint}>Источник должен быть из этой же команды (текущий клиент).</div>
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Что клонировать</div>
            <RadioGroup name="clone-mode" value={mode} onChange={(v) => setMode(v as CloneUserMode)}>
              {cloneModeOptions.map((x) => (
                <Radio key={x.value} value={x.value}>
                  {x.label}
                </Radio>
              ))}
            </RadioGroup>
          </div>

          {result ? (
            <div className={styles.hint}>
              Готово: группы {result.changedGroups}, клиенты {result.changedCompanies}, распределения {result.changedCompanyDistributions}, точки {result.changedPoints}, отчёты {result.changedCompanyReports}.
            </div>
          ) : null}

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Закрыть
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!sourceUserId || isSubmitting}
              onClick={() => {
                if (!sourceUserId) return
                setIsSubmitting(true)
                setError(null)
                setResult(null)
                const payload: CloneUserRequest = { sourceUserId, mode }
                axiosMainRequest
                  .post<CloneUserResponse>(apiRoutes.team.userClone(targetUserId), payload)
                  .then((res) => setResult(res.data))
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Не удалось клонировать'))
                  .finally(() => setIsSubmitting(false))
              }}
            >
              {isSubmitting ? 'Клонирование…' : 'Клонировать'}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  )
}

