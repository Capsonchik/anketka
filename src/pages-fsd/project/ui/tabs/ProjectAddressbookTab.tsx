import { useMemo, useState } from 'react'
import { Input, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'

import type { RefCitiesResponse, RefRegionsResponse, ShopPointItem } from '../../model/types'

import styles from '../ProjectPage.module.css'
import { ProjectAddressbookAddPointModal } from './ProjectAddressbookAddPointModal'
import { ProjectAddressbookEditPointModal } from './ProjectAddressbookEditPointModal'
import { ProjectAddressbookImportModal } from './ProjectAddressbookImportModal'
import { downloadApiFile } from '../../lib/downloadApiFile'

export function ProjectAddressbookTab ({
  projectId,
  onSelectFile,
  onUpload,
  isUploading,
  onCreatePoint,
  onUpdatePoint,
  onDeletePoint,
  isCreatingPoint,
  points,
  isPointsLoading,
  pointsError,
}: {
  projectId: string
  onSelectFile: (file: File | null) => void
  onUpload: () => void
  isUploading: boolean
  onCreatePoint: (payload: { chainName: string; address: string; city?: string | null; region?: string | null; concat?: string | null }) => void
  onUpdatePoint: (pointId: string, payload: { chainName: string; address: string; city?: string | null; region?: string | null; concat?: string | null }) => void
  onDeletePoint: (pointId: string) => void
  isCreatingPoint: boolean
  points: ShopPointItem[]
  isPointsLoading: boolean
  pointsError: string | null
}) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [editPoint, setEditPoint] = useState<ShopPointItem | null>(null)

  const [refsError, setRefsError] = useState<string | null>(null)
  const [isRefsLoading, setIsRefsLoading] = useState(false)
  const [regions, setRegions] = useState<RefRegionsResponse['items']>([])
  const [cities, setCities] = useState<RefCitiesResponse['items']>([])

  const [chainId, setChainId] = useState<string | null>(null)
  const [cityName, setCityName] = useState<string | null>(null)
  const [regionCode, setRegionCode] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const hasPoints = points.length > 0

  const chainOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of points) {
      if (p.chain?.id) map.set(p.chain.id, p.chain.name)
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [points])

  const cityOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of points) {
      const v = (p.cityName || '').trim()
      if (v) set.add(v)
    }
    return Array.from(set).sort().map((x) => ({ value: x, label: x }))
  }, [points])

  const regionOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of points) {
      const v = (p.regionCode || '').trim()
      if (v) set.add(v)
    }
    return Array.from(set).sort().map((x) => ({ value: x, label: x }))
  }, [points])

  const filteredPoints = useMemo(() => {
    const query = q.trim().toLowerCase()
    return points.filter((p) => {
      if (chainId && p.chain?.id !== chainId) return false
      if (cityName && (p.cityName || '').trim() !== cityName) return false
      if (regionCode && (p.regionCode || '').trim() !== regionCode) return false
      if (!query) return true

      const hay = [
        p.chain?.name,
        p.cityName,
        p.regionCode,
        p.address,
        p.concat,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return hay.includes(query)
    })
  }, [chainId, cityName, points, q, regionCode])

  async function ensureRefsLoaded () {
    if (regions.length > 0 && cities.length > 0) return
    setIsRefsLoading(true)
    setRefsError(null)
    try {
      const [regionsRes, citiesRes] = await Promise.all([
        axiosMainRequest.get<RefRegionsResponse>(apiRoutes.projects.refRegions),
        axiosMainRequest.get<RefCitiesResponse>(apiRoutes.projects.refCities),
      ])
      setRegions(regionsRes.data.items ?? [])
      setCities(citiesRes.data.items ?? [])
    } catch {
      setRefsError('Не удалось загрузить справочники городов/регионов')
      setRegions([])
      setCities([])
    } finally {
      setIsRefsLoading(false)
    }
  }

  async function openAdd () {
    await ensureRefsLoaded()
    setIsAddOpen(true)
  }

  async function openEdit (p: ShopPointItem) {
    await ensureRefsLoaded()
    setEditPoint(p)
    setIsEditOpen(true)
  }

  return (
    <div className={styles.tabPanel}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Адресная программа</div>
          <div className={styles.formRow}>
            <button type="button" className={styles.actionButton} onClick={openAdd} disabled={isCreatingPoint || isRefsLoading}>
              Добавить точку
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={async () => {
                setIsExporting(true)
                try {
                  await downloadApiFile({
                    url: apiRoutes.projects.addressbookExport(projectId),
                    params: {
                      q: q.trim() || null,
                      chainId: chainId ?? null,
                      cityName: cityName ?? null,
                      regionCode: regionCode ?? null,
                    },
                    fallbackFilename: 'addressbook.xlsx',
                  })
                } finally {
                  setIsExporting(false)
                }
              }}
              disabled={isPointsLoading || isExporting}
            >
              {isExporting ? 'Экспорт…' : 'Экспорт'}
            </button>
            <button type="button" className={styles.actionButton} onClick={() => setIsImportOpen(true)} disabled={isUploading}>
              Импорт Excel
            </button>
          </div>
        </div>

        {isPointsLoading ? <div className={styles.hint} style={{ marginTop: 10 }}>Загрузка точек…</div> : null}
        {pointsError ? <div className={styles.error} style={{ marginTop: 10 }}>{pointsError}</div> : null}
        {refsError ? <div className={styles.error} style={{ marginTop: 10 }}>{refsError}</div> : null}

        {hasPoints ? (
          <div className={styles.formRow} style={{ marginTop: 10 }}>
            <SelectPicker
              size="sm"
              value={chainId}
              onChange={(v) => setChainId((v as string | null) ?? null)}
              cleanable
              searchable
              placeholder="Сеть"
              data={chainOptions}
              style={{ minWidth: 220 }}
            />
            <SelectPicker
              size="sm"
              value={cityName}
              onChange={(v) => setCityName((v as string | null) ?? null)}
              cleanable
              searchable
              placeholder="Город"
              data={cityOptions}
              style={{ minWidth: 220 }}
            />
            <SelectPicker
              size="sm"
              value={regionCode}
              onChange={(v) => setRegionCode((v as string | null) ?? null)}
              cleanable
              searchable
              placeholder="Регион"
              data={regionOptions}
              style={{ minWidth: 160 }}
            />
            <Input
              size="sm"
              value={q}
              onChange={(v) => setQ(String(v ?? ''))}
              placeholder="Поиск по адресу…"
              style={{ minWidth: 260, flex: 1 }}
            />
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Сеть</th>
                <th className={styles.th}>Город</th>
                <th className={styles.th}>Регион</th>
                <th className={styles.th}>Адрес</th>
                <th className={styles.th} style={{ width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {filteredPoints.map((p) => (
                <tr key={p.id}>
                  <td className={styles.td}>{p.chain?.name || '—'}</td>
                  <td className={styles.td}>{p.cityName || '—'}</td>
                  <td className={styles.td}>{p.regionCode || '—'}</td>
                  <td className={styles.tdWrap}>{p.address || p.concat || '—'}</td>
                  <td className={styles.td}>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Редактировать"
                        disabled={isCreatingPoint || isRefsLoading}
                        onClick={() => {
                          openEdit(p)
                        }}
                      >
                        <img src="/icons/edit.svg" width={16} height={16} alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                        aria-label="Удалить"
                        disabled={isCreatingPoint}
                        onClick={() => {
                          const ok = window.confirm('Удалить точку из адресной программы?')
                          if (!ok) return
                          onDeletePoint(p.id)
                        }}
                      >
                        <img src="/icons/trash.svg" width={16} height={16} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPoints.length === 0 && !isPointsLoading ? (
                <tr>
                  <td className={styles.td} colSpan={5}>Нет точек</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ProjectAddressbookAddPointModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        isSubmitting={isCreatingPoint}
        regions={regions}
        cities={cities}
        onSubmit={(payload) => {
          onCreatePoint(payload)
          setIsAddOpen(false)
        }}
      />

      <ProjectAddressbookEditPointModal
        key={editPoint?.id ?? 'none'}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        isSubmitting={isCreatingPoint}
        point={editPoint}
        regions={regions}
        cities={cities}
        onSubmit={(payload) => {
          if (!editPoint) return
          onUpdatePoint(editPoint.id, payload)
          setIsEditOpen(false)
        }}
      />

      <ProjectAddressbookImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        disabled={false}
        isUploading={isUploading}
        onSelectFile={onSelectFile}
        onUpload={onUpload}
      />
    </div>
  )
}
