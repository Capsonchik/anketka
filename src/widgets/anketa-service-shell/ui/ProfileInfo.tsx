'use client'

import { useEffect, useMemo, useState } from 'react'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'

type UserMe = {
  id: string
  firstName: string
  lastName: string
  role: string
  company: {
    id: string
    name: string
  }
  email: string
  phone: string
  createdAt: string
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
  return 'Не удалось загрузить профиль'
}

export function ProfileInfo ({
  nameClassName,
  metaClassName,
}: {
  nameClassName: string
  metaClassName: string
}) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const name = useMemo(() => user?.firstName || '—', [user?.firstName])
  const meta = useMemo(() => user?.company?.name || '—', [user?.company?.name])

  useEffect(() => {
    let isAlive = true

    axiosMainRequest
      .get<UserMe>(apiRoutes.users.me)
      .then((res) => {
        if (!isAlive) return
        setUser(res.data)
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
  }, [])

  if (isLoading) {
    return (
      <>
        <div className={nameClassName}>Загрузка…</div>
        <div className={metaClassName}> </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className={nameClassName}>Профиль</div>
        <div className={metaClassName} title={error}>
          ошибка
        </div>
      </>
    )
  }

  return (
    <>
      <div className={nameClassName}>{name}</div>
      <div className={metaClassName}>{meta}</div>
    </>
  )
}

