'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'

import type { ClientItem, ClientsResponse } from '../model/types'
import { ClientCard } from './ClientCard'
import { ClientOwnersModal } from './ClientOwnersModal'
import { ClientCreateWizardModal } from '@/pages-fsd/clients/ui/ClientCreateWizardModal'
import { ClientEditModal } from './ClientEditModal'

import styles from './ClientsPage.module.css'

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

  const loadClients = useCallback(async () => {
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
  }, [showArchived])

  useEffect(() => {
    loadClients()
  }, [loadClients])

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
              <ClientCard
                key={c.id}
                client={c}
                onEdit={() => {
                  setEditClient(c)
                  setIsEditOpen(true)
                }}
                onToggleArchive={async () => {
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
                onOwners={() => {
                  setOwnersClientId(c.id)
                  setOwnersClientName(c.name)
                  setIsOwnersOpen(true)
                }}
              />
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
        onChanged={() => {
          loadClients()
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

