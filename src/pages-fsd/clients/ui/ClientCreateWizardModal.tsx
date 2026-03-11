'use client'

import { useMemo, useState } from 'react'
import { Input, Modal, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import type {
  ClientApUploadResponse,
  ClientItem,
  ClientUsersImportResponse,
  CreateClientRequest,
  UpdateClientRequest,
} from '../model/types'

import styles from './ClientCreateWizardModal.module.css'

type Step = 1 | 2 | 3 | 4 | 5

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
      if (typeof detail === 'object' && detail) {
        const d = detail as Record<string, unknown>
        if (Array.isArray(d.errors)) return 'Ошибка импорта'
      }
    }
  }
  if (err instanceof Error && err.message) return err.message
  return 'Ошибка запроса'
}

export function ClientCreateWizardModal ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState<Step>(1)
  const [client, setClient] = useState<ClientItem | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string | null>('retail')

  const [theme, setTheme] = useState<Record<string, unknown>>({
    primary: '#2a7fff',
    accent: '#77dde7',
    gradientFrom: '#e6f0ff',
    gradientTo: '#f4fbff',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)

  const [filtersJson, setFiltersJson] = useState('[]')

  const [apFile, setApFile] = useState<File | null>(null)
  const [apResult, setApResult] = useState<ClientApUploadResponse | null>(null)

  const [usersFile, setUsersFile] = useState<File | null>(null)
  const [usersResult, setUsersResult] = useState<ClientUsersImportResponse | null>(null)

  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canNext = useMemo(() => {
    if (isBusy) return false
    if (step === 1) return name.trim().length > 0
    return true
  }, [isBusy, name, step])

  function resetAll () {
    setStep(1)
    setClient(null)
    setName('')
    setCategory('retail')
    setTheme({ primary: '#2a7fff', accent: '#77dde7', gradientFrom: '#e6f0ff', gradientTo: '#f4fbff' })
    setLogoFile(null)
    setBackgroundFile(null)
    setFiltersJson('[]')
    setApFile(null)
    setApResult(null)
    setUsersFile(null)
    setUsersResult(null)
    setIsBusy(false)
    setError(null)
  }

  async function submitStep1Create () {
    setIsBusy(true)
    setError(null)
    try {
      const payload: CreateClientRequest = {
        name: name.trim(),
        category: category ?? null,
        theme: theme ?? {},
        filters: [],
      }
      const res = await axiosMainRequest.post<ClientItem>(apiRoutes.clients.clients, payload)
      setClient(res.data)
      setStep(2)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function saveSettings () {
    if (!client) return
    setIsBusy(true)
    setError(null)
    try {
      const payload: UpdateClientRequest = {
        category: category ?? null,
        name: name.trim() || client.name,
        theme,
      }
      const res = await axiosMainRequest.patch<ClientItem>(apiRoutes.clients.client(client.id), payload)
      setClient(res.data)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
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
      const res = await axiosMainRequest.post<ClientItem>(url, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setClient(res.data)
      if (kind === 'logo') setLogoFile(null)
      else setBackgroundFile(null)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function saveFilters () {
    if (!client) return
    setIsBusy(true)
    setError(null)
    try {
      const parsed = JSON.parse(filtersJson || '[]')
      const res = await axiosMainRequest.patch<ClientItem>(apiRoutes.clients.client(client.id), { filters: parsed })
      setClient(res.data)
      setStep(4)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Некорректный JSON или ошибка сохранения')
    } finally {
      setIsBusy(false)
    }
  }

  async function uploadAp () {
    if (!client || !apFile) return
    setIsBusy(true)
    setError(null)
    setApResult(null)
    try {
      const fd = new FormData()
      fd.append('file', apFile)
      const res = await axiosMainRequest.post<ClientApUploadResponse>(apiRoutes.clients.apUpload(client.id), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setApResult(res.data)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function importUsers () {
    if (!client || !usersFile) return
    setIsBusy(true)
    setError(null)
    setUsersResult(null)
    try {
      const fd = new FormData()
      fd.append('file', usersFile)
      const res = await axiosMainRequest.post<ClientUsersImportResponse>(`${apiRoutes.clients.usersImport(client.id)}?updateExisting=true&generateRandomPasswordIfEmpty=true`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUsersResult(res.data)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  const stepTitle =
    step === 1 ? 'Шаг 1 · Клиент' :
    step === 2 ? 'Шаг 2 · Брендинг' :
    step === 3 ? 'Шаг 3 · Фильтры' :
    step === 4 ? 'Шаг 4 · Адресная программа (АП)' :
    'Шаг 5 · Пользователи'

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose()
        resetAll()
      }}
      size="md"
    >
      <Modal.Header>
        <Modal.Title>Создание клиента</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.stepTitle}>{stepTitle}</div>

        {error ? <div className={styles.error}>{error}</div> : null}

        {step === 1 ? (
          <div className={styles.grid}>
            <div className={styles.row}>
              <div className={styles.label}>Категория</div>
              <SelectPicker
                value={category}
                onChange={(v) => setCategory((v as string | null) ?? null)}
                data={categoryOptions}
                cleanable={false}
                searchable={false}
                block
              />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Название *</div>
              <Input value={name} onChange={(v) => setName(String(v ?? ''))} placeholder="Например, Ритейл-Сеть X" />
            </div>
            <div className={styles.hint}>После создания появятся шаги загрузки АП и пользователей.</div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className={styles.grid}>
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
              <div className={styles.hint}>Сохраняем как JSON в настройках клиента.</div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className={styles.grid}>
            <div className={styles.row}>
              <div className={styles.label}>Фильтры клиента (JSON)</div>
              <textarea className={styles.jsonArea} value={filtersJson} onChange={(e) => setFiltersJson(e.target.value)} />
              <div className={styles.hint}>MVP: сохраняем определения фильтров как массив объектов.</div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className={styles.grid}>
            <div className={styles.row}>
              <div className={styles.label}>Загрузить АП (Excel/CSV)</div>
              <input type="file" accept=".xlsx,.csv" onChange={(e) => setApFile(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="secondary" disabled={!apFile || isBusy} onClick={uploadAp}>
                Загрузить
              </Button>
              {apResult ? <div className={styles.hint}>Создано: {apResult.created} · Обновлено: {apResult.updated}</div> : null}
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className={styles.grid}>
            <div className={styles.row}>
              <div className={styles.label}>Импорт пользователей (Excel/CSV)</div>
              <input type="file" accept=".xlsx,.csv" onChange={(e) => setUsersFile(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="secondary" disabled={!usersFile || isBusy} onClick={importUsers}>
                Импортировать
              </Button>
              {usersResult ? (
                <div className={styles.hint}>
                  Создано: {usersResult.created} · Обновлено: {usersResult.updated} · Пропущено: {usersResult.skipped}
                  {usersResult.errors?.length ? ` · Ошибок: ${usersResult.errors.length}` : ''}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={() => {
                if (step === 1) {
                  onClose()
                  resetAll()
                  return
                }
                setStep((s) => (s === 1 ? 1 : ((s - 1) as Step)))
              }}
            >
              {step === 1 ? 'Закрыть' : 'Назад'}
            </Button>
          </div>

          <div className={styles.footerRight}>
            {step === 2 ? (
              <Button type="button" variant="secondary" disabled={isBusy || !client} onClick={saveSettings}>
                Сохранить
              </Button>
            ) : null}

            {step === 3 ? (
              <Button type="button" variant="secondary" disabled={isBusy || !client} onClick={saveFilters}>
                Сохранить и далее
              </Button>
            ) : null}

            <Button
              type="button"
              variant="primary"
              disabled={!canNext}
              onClick={async () => {
                if (step === 1) {
                  await submitStep1Create()
                  return
                }
                if (step === 2) {
                  await saveSettings()
                  setStep(3)
                  return
                }
                if (step === 4) {
                  setStep(5)
                  return
                }
                if (step === 5) {
                  onCreated()
                  resetAll()
                  return
                }
                setStep((s) => (s === 5 ? 5 : ((s + 1) as Step)))
              }}
            >
              {step === 1 ? 'Создать' : step === 5 ? 'Готово' : 'Далее'}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

