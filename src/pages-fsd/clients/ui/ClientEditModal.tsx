'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, Modal, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import type { ClientItem, UpdateClientRequest } from '../model/types'
import type { ClientFilterDef } from './ClientFiltersEditor'
import { ClientFiltersEditor } from './ClientFiltersEditor'

import styles from './ClientCreateWizardModal.module.css'

const categoryOptions = [
  { value: 'auto', label: 'Авто' },
  { value: 'retail', label: 'Ритейл' },
  { value: 'bank', label: 'Банк' },
  { value: 'other', label: 'Другое' },
]

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

export function ClientEditModal ({
  open,
  client,
  onClose,
  onSaved,
}: {
  open: boolean
  client: ClientItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [theme, setTheme] = useState<Record<string, unknown>>({})
  const [filters, setFilters] = useState<ClientFilterDef[]>([])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)

  const presetKey = useMemo(() => ((category ?? 'other') as 'retail' | 'auto' | 'bank' | 'other'), [category])

  useEffect(() => {
    if (!open || !client) return
    setError(null)
    setIsBusy(false)
    setName(client.name ?? '')
    setCategory(client.category ?? null)
    setTheme(client.theme ?? {})
    setFilters((client.filters as ClientFilterDef[]) ?? [])
    setLogoFile(null)
    setBackgroundFile(null)
  }, [open, client])

  async function save () {
    if (!client) return
    setIsBusy(true)
    setError(null)
    try {
      const payload: UpdateClientRequest = {
        name: name.trim() || client.name,
        category: category ?? null,
        theme,
        filters,
      }
      await axiosMainRequest.patch(apiRoutes.clients.client(client.id), payload)
      onSaved()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
      setIsBusy(false)
    }
  }

  async function uploadAsset (kind: 'logo' | 'background') {
    if (!client) return
    const file = kind === 'logo' ? logoFile : backgroundFile
    if (!file) return
    setIsBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const url = kind === 'logo' ? apiRoutes.clients.logo(client.id) : apiRoutes.clients.background(client.id)
      await axiosMainRequest.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (kind === 'logo') setLogoFile(null)
      else setBackgroundFile(null)
      onSaved()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Редактирование клиента</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.grid}>
          <div className={styles.row}>
            <div className={styles.label}>Категория</div>
            <SelectPicker
              value={category}
              onChange={(v) => setCategory((v as string | null) ?? null)}
              data={categoryOptions}
              cleanable
              searchable={false}
              block
              disabled={isBusy}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Название</div>
            <Input value={name} onChange={(v) => setName(String(v ?? ''))} disabled={isBusy} />
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Лого</div>
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" disabled={!logoFile || isBusy} onClick={() => uploadAsset('logo')}>
                Загрузить лого
              </Button>
              {client?.logoUrl ? <a href={client.logoUrl} target="_blank" rel="noreferrer" className={styles.hint}>Открыть</a> : null}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Фон</div>
            <input type="file" accept="image/*" onChange={(e) => setBackgroundFile(e.target.files?.[0] ?? null)} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" disabled={!backgroundFile || isBusy} onClick={() => uploadAsset('background')}>
                Загрузить фон
              </Button>
              {client?.backgroundUrl ? <a href={client.backgroundUrl} target="_blank" rel="noreferrer" className={styles.hint}>Открыть</a> : null}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Цвета</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label className={styles.hint}>
                Primary
                <input type="color" value={String(theme.primary ?? '#2a7fff')} onChange={(e) => setTheme((p) => ({ ...p, primary: e.target.value }))} />
              </label>
              <label className={styles.hint}>
                Accent
                <input type="color" value={String(theme.accent ?? '#77dde7')} onChange={(e) => setTheme((p) => ({ ...p, accent: e.target.value }))} />
              </label>
              <label className={styles.hint}>
                Gradient From
                <input type="color" value={String(theme.gradientFrom ?? '#e6f0ff')} onChange={(e) => setTheme((p) => ({ ...p, gradientFrom: e.target.value }))} />
              </label>
              <label className={styles.hint}>
                Gradient To
                <input type="color" value={String(theme.gradientTo ?? '#f4fbff')} onChange={(e) => setTheme((p) => ({ ...p, gradientTo: e.target.value }))} />
              </label>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Фильтры</div>
            <ClientFiltersEditor value={filters} categoryPreset={presetKey} onChange={setFilters} />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <Button type="button" variant="ghost" disabled={isBusy} onClick={onClose}>
              Закрыть
            </Button>
          </div>
          <div className={styles.footerRight}>
            <Button type="button" variant="primary" disabled={isBusy} onClick={save}>
              {isBusy ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

