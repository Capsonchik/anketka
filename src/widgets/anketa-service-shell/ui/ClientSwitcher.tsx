'use client'

import { useEffect, useMemo } from 'react'
import { SelectPicker } from 'rsuite'

import { readActiveCompanyId, writeActiveCompanyId } from '@/api-config/company-context'
import { useBootstrapData } from '@/shared/lib/bootstrap-data'

import styles from './AnketaServiceShell.module.css'

export function ClientSwitcher ({ collapsed }: { collapsed?: boolean }) {
  const { clients, isLoading } = useBootstrapData()

  const hasMultiple = useMemo(() => clients.length > 1, [clients.length])
  const activeId = useMemo(() => {
    if (!clients.length) return readActiveCompanyId()
    const stored = readActiveCompanyId()
    const next = stored && clients.some((x) => x.id === stored) ? stored : clients[0].id
    return next
  }, [clients])

  useEffect(() => {
    if (isLoading) return
    if (clients.length === 0) {
      writeActiveCompanyId(null)
      return
    }

    const stored = readActiveCompanyId()
    if (stored && clients.some((x) => x.id === stored)) return
    writeActiveCompanyId(clients[0].id)
  }, [clients, isLoading])

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

