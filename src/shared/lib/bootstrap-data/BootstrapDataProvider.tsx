'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { readActiveCompanyId, writeActiveCompanyId } from '@/api-config/company-context'
import type { UserRole } from '@/entities/user'

type Me = {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  platformRole: string
  permissions: string[]
  company: { id: string; name: string } | null
}

type ClientShort = { id: string; name: string }

type BootstrapData = {
  me: Me | null
  clients: ClientShort[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

const BootstrapDataContext = createContext<BootstrapData | null>(null)

let meCache: Me | null = null
let clientsCache: ClientShort[] | null = null
let mePromise: Promise<Me> | null = null
let clientsPromise: Promise<ClientShort[]> | null = null

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

async function fetchMeCached () {
  if (meCache) return meCache
  if (!mePromise) {
    mePromise = axiosMainRequest
      .get<Me>(apiRoutes.users.me)
      .then((res) => res.data)
      .finally(() => {
        mePromise = null
      })
  }
  meCache = await mePromise
  return meCache
}

async function fetchClientsCached () {
  if (clientsCache) return clientsCache
  if (!clientsPromise) {
    const headers = getDefaultHeadersWithoutCompany()
    clientsPromise = axiosMainRequest
      .get<{ items: ClientShort[] }>(apiRoutes.clients.clients, { headers })
      .then((res) => res.data.items ?? [])
      .finally(() => {
        clientsPromise = null
      })
  }
  clientsCache = await clientsPromise
  return clientsCache
}

function getDefaultHeadersWithoutCompany () {
  const raw = axiosMainRequest.defaults.headers.common
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.toLowerCase() === 'x-company-id') continue
    if (typeof v === 'string' && v) headers[k] = v
  }
  return headers
}

function ensureActiveCompany (clients: ClientShort[]) {
  if (!clients.length) {
    writeActiveCompanyId(null)
    return
  }

  const stored = readActiveCompanyId()
  const next = stored && clients.some((x) => x.id === stored) ? stored : clients[0].id
  writeActiveCompanyId(next)
}

export function BootstrapDataProvider ({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(meCache)
  const [clients, setClients] = useState<ClientShort[]>(clientsCache ?? [])
  const [isLoading, setIsLoading] = useState(!meCache || !clientsCache)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  function reload () {
    meCache = null
    clientsCache = null
    mePromise = null
    clientsPromise = null
    setMe(null)
    setClients([])
    setError(null)
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }

  useEffect(() => {
    let isAlive = true

    const hasCache = Boolean(meCache) && Boolean(clientsCache)
    if (hasCache && reloadKey === 0) {
      ensureActiveCompany(clientsCache ?? [])
      return () => {
        isAlive = false
      }
    }

    Promise.all([fetchMeCached(), fetchClientsCached()])
      .then(([meRes, clientsRes]) => {
        if (!isAlive) return
        setMe(meRes)
        setClients(clientsRes)
        ensureActiveCompany(clientsRes)
      })
      .catch((err: unknown) => {
        if (!isAlive) return
        setError(getApiErrorMessage(err))
      })
      .finally(() => {
        if (!isAlive) return
        setIsLoading(false)
      })

    return () => {
      isAlive = false
    }
  }, [reloadKey])

  const value = useMemo<BootstrapData>(
    () => ({
      me,
      clients,
      isLoading,
      error,
      reload,
    }),
    [clients, error, isLoading, me],
  )

  return <BootstrapDataContext.Provider value={value}>{children}</BootstrapDataContext.Provider>
}

export function useBootstrapData () {
  const ctx = useContext(BootstrapDataContext)
  if (!ctx) throw new Error('BootstrapDataProvider is missing')
  return ctx
}

