'use client'

import { useMemo } from 'react'

import { useBootstrapData } from '@/shared/lib/bootstrap-data'

export function ProfileInfo ({
  nameClassName,
  metaClassName,
}: {
  nameClassName: string
  metaClassName: string
}) {
  const { me, isLoading, error } = useBootstrapData()

  const name = useMemo(() => me?.firstName || '—', [me?.firstName])
  const meta = useMemo(() => me?.company?.name || '—', [me?.company?.name])

  if (isLoading && !me) {
    return (
      <>
        <div className={nameClassName}>Загрузка…</div>
        <div className={metaClassName}> </div>
      </>
    )
  }

  if (error && !me) {
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

