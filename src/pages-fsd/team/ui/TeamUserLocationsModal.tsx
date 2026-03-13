'use client'

import { useEffect, useMemo, useState } from 'react'
import { Checkbox, Input, Modal, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { readActiveCompanyId } from '@/api-config/company-context'
import type { ClientsResponse } from '@/pages-fsd/clients/model/types'
import type { RefRegionItem, RefRegionsResponse, ShopPointItem, ShopPointsResponse } from '@/pages-fsd/project/model/types'
import { Button, PageLoader } from '@/shared/ui'

import type { UserPointAccessReplaceRequest, UserPointAccessResponse } from '../model/types'
import styles from './TeamUserLocationsModal.module.css'

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

function pointLabel (p: ShopPointItem) {
  const name = p.pointName?.trim() || 'Точка'
  const addr = p.address?.trim() || ''
  const city = p.cityName?.trim() || ''
  const reg = p.regionCode?.trim() || ''
  const parts = [reg && `рег. ${reg}`, city, addr].filter(Boolean)
  return { title: `${p.code} · ${name}`, sub: parts.join(' · ') || '—' }
}

export function TeamUserLocationsModal ({
  open,
  userId,
  onClose,
  canEdit,
}: {
  open: boolean
  userId: string | null
  onClose: () => void
  canEdit: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [baseApProjectId, setBaseApProjectId] = useState<string | null>(null)
  const [regions, setRegions] = useState<RefRegionItem[]>([])
  const [points, setPoints] = useState<ShopPointItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [q, setQ] = useState('')
  const [regionCode, setRegionCode] = useState<string | null>(null)

  const regionOptions = useMemo(
    () => [{ value: null, label: 'Все регионы' }, ...regions.map((r) => ({ value: r.code, label: `${r.code} · ${r.name}` }))],
    [regions],
  )

  const selectedCount = selected.size
  const visibleSelectedCount = useMemo(() => points.reduce((acc, p) => (selected.has(p.id) ? acc + 1 : acc), 0), [points, selected])

  useEffect(() => {
    if (!open || !userId) return
    let isAlive = true
    setIsLoading(true)
    setError(null)
    setPoints([])
    setRegions([])
    setRegionCode(null)
    setQ('')

    ;(async () => {
      try {
        const activeCompanyId = readActiveCompanyId()
        const [cRes, rRes, aRes] = await Promise.all([
          axiosMainRequest.get<ClientsResponse>(apiRoutes.clients.clients),
          axiosMainRequest.get<RefRegionsResponse>(apiRoutes.projects.refRegions),
          axiosMainRequest.get<UserPointAccessResponse>(apiRoutes.team.userPointAccess(userId)),
        ])
        if (!isAlive) return

        const clients = cRes.data.items ?? []
        const activeClient = (activeCompanyId ? clients.find((x) => x.id === activeCompanyId) : null) ?? clients[0] ?? null
        const baseId = activeClient?.baseApProjectId ?? aRes.data.projectId ?? null
        setBaseApProjectId(baseId)
        setRegions(rRes.data.items ?? [])
        setSelected(new Set(aRes.data.pointIds ?? []))

        if (baseId) {
          const pRes = await axiosMainRequest.get<ShopPointsResponse>(apiRoutes.projects.addressbook(baseId))
          if (!isAlive) return
          setPoints(pRes.data.items ?? [])
        } else {
          setPoints([])
        }
      } catch (err: unknown) {
        if (!isAlive) return
        setError(getApiErrorMessage(err))
        setBaseApProjectId(null)
        setPoints([])
        setRegions([])
        setSelected(new Set())
      } finally {
        if (!isAlive) return
        setIsLoading(false)
      }
    })()

    return () => {
      isAlive = false
    }
  }, [open, userId])

  useEffect(() => {
    if (!open || !baseApProjectId) return
    let isAlive = true
    const t = window.setTimeout(() => {
      ;(async () => {
        try {
          setError(null)
          const params: Record<string, string> = {}
          if (q.trim()) params.q = q.trim()
          if (regionCode) params.regionCode = regionCode
          const res = await axiosMainRequest.get<ShopPointsResponse>(apiRoutes.projects.addressbook(baseApProjectId), { params })
          if (!isAlive) return
          setPoints(res.data.items ?? [])
        } catch (err: unknown) {
          if (!isAlive) return
          setError(getApiErrorMessage(err))
        }
      })()
    }, 250)
    return () => {
      isAlive = false
      window.clearTimeout(t)
    }
  }, [baseApProjectId, open, q, regionCode])

  function togglePoint (id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function selectAllVisible () {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const p of points) next.add(p.id)
      return next
    })
  }

  function clearVisible () {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const p of points) next.delete(p.id)
      return next
    })
  }

  async function save () {
    if (!userId) return
    setIsSaving(true)
    setError(null)
    try {
      const payload: UserPointAccessReplaceRequest = { pointIds: [...selected] }
      const res = await axiosMainRequest.put<UserPointAccessResponse>(apiRoutes.team.userPointAccess(userId), payload)
      setSelected(new Set(res.data.pointIds ?? []))
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Локации пользователя</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <div className={styles.loadingWrap}>
            <PageLoader centered size="lg" />
          </div>
        ) : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {!baseApProjectId && !isLoading ? <div className={styles.hint}>Сначала загрузите адресную программу (АП) для клиента.</div> : null}

        <div className={styles.filters}>
          <Input
            value={q}
            onChange={(v) => setQ(String(v ?? ''))}
            placeholder="Поиск по коду/названию/адресу…"
            disabled={isLoading || !baseApProjectId}
          />
          <SelectPicker
            value={regionCode}
            onChange={(v) => setRegionCode((v as string | null) ?? null)}
            data={regionOptions}
            cleanable={false}
            searchable
            block
            disabled={isLoading || !baseApProjectId}
          />
          <Button type="button" variant="secondary" disabled={isLoading || !baseApProjectId} onClick={selectAllVisible}>
            Выбрать видимые
          </Button>
          <Button type="button" variant="ghost" disabled={isLoading || !baseApProjectId} onClick={clearVisible}>
            Снять видимые
          </Button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: 44 }} />
                <th className={styles.th}>Точка</th>
                <th className={styles.th} style={{ width: 100 }}>Регион</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => {
                const checked = selected.has(p.id)
                const lbl = pointLabel(p)
                return (
                  <tr key={p.id}>
                    <td className={styles.td}>
                      <Checkbox
                        checked={checked}
                        disabled={!canEdit || isLoading}
                        onChange={(_, nextChecked) => togglePoint(p.id, Boolean(nextChecked))}
                        aria-label={`Выбрать точку ${p.code}`}
                      />
                    </td>
                    <td className={styles.td}>
                      <div className={styles.pointTitle}>
                        <div className={styles.mono}>{lbl.title}</div>
                        <div className={styles.pointSub}>{lbl.sub}</div>
                      </div>
                    </td>
                    <td className={[styles.td, styles.mono].join(' ')}>{p.regionCode || '—'}</td>
                  </tr>
                )
              })}
              {!points.length && !isLoading ? (
                <tr>
                  <td className={styles.td} colSpan={3}>Точек не найдено</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footer}>
          <div className={styles.counter}>
            Выбрано: {selectedCount}. В видимых: {visibleSelectedCount}.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="button" variant="ghost" disabled={isSaving} onClick={onClose}>
              Закрыть
            </Button>
            <Button type="button" variant="primary" disabled={!canEdit || isSaving || !baseApProjectId} onClick={save}>
              {isSaving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

