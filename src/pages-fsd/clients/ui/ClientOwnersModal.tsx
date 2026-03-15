'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, Modal } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import type { ClientOwnerItem, ClientOwnersResponse, GrantClientOwnerRequest } from '../model/types'
import styles from './ClientOwnersModal.module.css'

function fmtDt (value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 19)
  return new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
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

export function ClientOwnersModal ({
  open,
  clientId,
  clientName,
  onClose,
}: {
  open: boolean
  clientId: string | null
  clientName: string | null
  onClose: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ClientOwnerItem[]>([])
  const [email, setEmail] = useState('')

  const title = useMemo(() => (clientName ? `Владельцы клиента: ${clientName}` : 'Владельцы клиента'), [clientName])

  async function load () {
    if (!clientId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await axiosMainRequest.get<ClientOwnersResponse>(apiRoutes.clients.owners(clientId))
      setItems(res.data.items ?? [])
    } catch (err: unknown) {
      setItems([])
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !clientId) return
    setEmail('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId])

  async function grant () {
    if (!clientId) return
    const v = email.trim()
    if (!v) return
    setIsSaving(true)
    setError(null)
    try {
      const payload: GrantClientOwnerRequest = { email: v }
      const res = await axiosMainRequest.post<ClientOwnersResponse>(apiRoutes.clients.owners(clientId), payload)
      setItems(res.data.items ?? [])
      setEmail('')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  async function revoke (ownerUserId: string) {
    if (!clientId) return
    if (!window.confirm('Снять доступ у владельца к этому клиенту?')) return
    setIsSaving(true)
    setError(null)
    try {
      const url = `${apiRoutes.clients.owners(clientId)}/${ownerUserId}`
      const res = await axiosMainRequest.delete<ClientOwnersResponse>(url)
      setItems(res.data.items ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.row}>
          <Input
            className={styles.input}
            value={email}
            onChange={(v) => setEmail(String(v ?? ''))}
            placeholder="email пользователя…"
            type="email"
            disabled={!clientId || isLoading || isSaving}
          />
          <Button type="button" variant="primary" disabled={!clientId || isLoading || isSaving || !email.trim()} onClick={grant}>
            Выдать
          </Button>
        </div>

        <div className={styles.list}>
          {items.map((x) => (
            <div key={x.userId} className={styles.item}>
              <div className={styles.left}>
                <div className={styles.email}>{x.email}</div>
                <div className={styles.meta}>
                  <span className={styles.mono}>{x.userId}</span> · {fmtDt(x.createdAt)}
                </div>
              </div>
              <Button type="button" variant="ghost" disabled={isSaving} onClick={() => revoke(x.userId)}>
                Снять
              </Button>
            </div>
          ))}
          {!items.length && !isLoading ? <div className={styles.hint}>Владельцев пока нет</div> : null}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footer}>
          <Button type="button" variant="ghost" disabled={isSaving} onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

