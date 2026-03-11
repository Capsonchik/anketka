'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'

import type { ClientItem, ClientsResponse } from '../model/types'
import { ClientOwnersModal } from './ClientOwnersModal'
import { ClientCreateWizardModal } from '@/pages-fsd/clients/ui/ClientCreateWizardModal'
import { ClientEditModal } from './ClientEditModal'

import styles from './ClientsPage.module.css'

function fmtDt (value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function ClientsPage () {
  const [clients, setClients] = useState<ClientItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [editClient, setEditClient] = useState<ClientItem | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [ownersClientId, setOwnersClientId] = useState<string | null>(null)
  const [ownersClientName, setOwnersClientName] = useState<string | null>(null)
  const [isOwnersOpen, setIsOwnersOpen] = useState(false)

  async function loadClients () {
    setIsLoading(true)
    setError(null)
    try {
      const res = await axiosMainRequest.get<ClientsResponse>(`${apiRoutes.clients.clients}?includeArchived=${String(showArchived)}`)
      setClients(res.data.items ?? [])
    } catch (err: unknown) {
      setClients([])
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [showArchived])

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className="titleH1">Клиенты</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label className={styles.subTitle} style={{ marginTop: 0 }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Показать архив
          </label>
          <button
            type="button"
            className={styles.addIconButton}
            aria-label="Создать клиента"
            onClick={() => setIsWizardOpen(true)}
          >
            <Image src="/icons/add.svg" alt="" width={18} height={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.subTitle}>Создавайте клиентов и настраивайте их базовые параметры, АП и пользователей.</div>

      {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      {!isLoading && !error ? (
        clients.length === 0 ? (
          <div className={styles.hint}>Клиентов пока нет</div>
        ) : (
          <div className={styles.list}>
            {clients.map((c) => (
              <div key={c.id} className={styles.card}>
                <div className={styles.cardTitle}>{c.name}</div>
                <div className={styles.cardMeta}>
                  <span>Категория: {c.category || '—'}</span>
                  <span>Создан: {fmtDt(c.createdAt)}</span>
                  <span>АП: {c.baseApProjectId ? 'загружена' : '—'}</span>
                  <span>{c.isArchived ? 'Архив' : 'Активен'}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.cardButton}
                    onClick={() => {
                      setEditClient(c)
                      setIsEditOpen(true)
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className={styles.cardButton}
                    onClick={async () => {
                      const next = !c.isArchived
                      const q = next ? 'Архивировать клиента?' : 'Вернуть из архива?'
                      if (!window.confirm(q)) return
                      try {
                        await axiosMainRequest.patch(apiRoutes.clients.client(c.id), { isArchived: next })
                        await loadClients()
                      } catch (err: unknown) {
                        setError(getApiErrorMessage(err))
                      }
                    }}
                  >
                    {c.isArchived ? 'Разархивировать' : 'Архивировать'}
                  </button>
                  <button
                    type="button"
                    className={styles.cardButton}
                    onClick={() => {
                      setOwnersClientId(c.id)
                      setOwnersClientName(c.name)
                      setIsOwnersOpen(true)
                    }}
                  >
                    Овнеры
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      <ClientCreateWizardModal
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={() => {
          setIsWizardOpen(false)
          loadClients()
        }}
      />

      <ClientOwnersModal
        open={isOwnersOpen}
        clientId={ownersClientId}
        clientName={ownersClientName}
        onClose={() => {
          setIsOwnersOpen(false)
          setOwnersClientId(null)
          setOwnersClientName(null)
        }}
      />

      <ClientEditModal
        open={isEditOpen}
        client={editClient}
        onClose={() => {
          setIsEditOpen(false)
          setEditClient(null)
        }}
        onSaved={() => {
          setIsEditOpen(false)
          setEditClient(null)
          loadClients()
        }}
      />
    </div>
  )
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
  return 'Не удалось загрузить клиентов'
}

