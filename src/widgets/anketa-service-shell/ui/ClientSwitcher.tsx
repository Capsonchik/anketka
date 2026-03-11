'use client'

import { useEffect, useState } from 'react'
import { SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { readActiveCompanyId, writeActiveCompanyId } from '@/api-config/company-context'

import styles from './AnketaServiceShell.module.css'

type ClientItem = { id: string; name: string }
type ClientsResponse = { items: ClientItem[] }

export function ClientSwitcher ({ collapsed }: { collapsed?: boolean }) {
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
  if (clients.length === 0) return null

  return (
    <SelectPicker
      className={[styles.clientSelect, collapsed ? styles.clientSelectCollapsed : null].filter(Boolean).join(' ')}
      data={clients.map((c) => ({ value: c.id, label: c.name }))}
      value={activeId}
      onChange={(value) => {
        const next = String(value || '').trim() || null
        writeActiveCompanyId(next)
        setActiveId(next)
        window.location.reload()
      }}
      aria-label="Клиент"
      cleanable={false}
      searchable={!collapsed}
      disabled={!hasMultiple}
      size="sm"
      block
      placement="bottomStart"
    />
  )
}

