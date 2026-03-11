'use client'

import { useEffect, useState } from 'react'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { readActiveCompanyId, writeActiveCompanyId } from '@/api-config/company-context'

import styles from './AnketaServiceShell.module.css'

type ClientItem = { id: string; name: string }
type ClientsResponse = { items: ClientItem[] }

export function ClientSwitcher () {
  const [clients, setClients] = useState<ClientItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(() => readActiveCompanyId())

  const hasMultiple = clients.length > 1

  useEffect(() => {
    let isAlive = true
    axiosMainRequest
      .get<ClientsResponse>(apiRoutes.clients.clients)
      .then((res) => {
        if (!isAlive) return
        const items = res.data.items ?? []
        setClients(items)

        if (items.length === 0) {
          writeActiveCompanyId(null)
          setActiveId(null)
          return
        }

        const stored = readActiveCompanyId()
        const next = stored && items.some((x) => x.id === stored) ? stored : items[0].id
        writeActiveCompanyId(next)
        setActiveId(next)
      })
      .finally(() => {
        if (!isAlive) return
        setIsLoading(false)
      })

    return () => {
      isAlive = false
    }
  }, [])

  if (isLoading) return null
  if (!hasMultiple) return null

  return (
    <select
      className={styles.clientSelect}
      value={activeId ?? ''}
      onChange={(e) => {
        const next = String(e.target.value || '').trim() || null
        writeActiveCompanyId(next)
        setActiveId(next)
        window.location.reload()
      }}
      aria-label="Клиент"
    >
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}

