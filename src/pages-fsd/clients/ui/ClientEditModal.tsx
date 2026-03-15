'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button as RsuiteButton, Input, Loader, Modal, SelectPicker, Uploader } from 'rsuite'

import axiosMainRequest, { MAIN_API } from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'
import type { ShopPointItem, ShopPointsResponse } from '@/pages-fsd/project/model/types'

import type { ClientApUploadResponse, ClientItem, UpdateClientRequest } from '../model/types'
import type { ClientFilterDef } from './ClientFiltersEditor'
import { ClientFiltersEditor } from './ClientFiltersEditor'

import styles from './ClientEditModal.module.css'

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
  onChanged,
}: {
  open: boolean
  client: ClientItem | null
  onClose: () => void
  onSaved: () => void
  onChanged?: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Редактирование клиента</Modal.Title>
      </Modal.Header>
      {open && client ? <ClientEditModalInner key={client.id} initialClient={client} onClose={onClose} onSaved={onSaved} onChanged={onChanged} /> : null}
    </Modal>
  )
}

function ClientEditModalInner ({
  initialClient,
  onClose,
  onSaved,
  onChanged,
}: {
  initialClient: ClientItem
  onClose: () => void
  onSaved: () => void
  onChanged?: () => void
}) {
  const [busyKind, setBusyKind] = useState<'save' | 'uploadLogo' | 'uploadBackground' | 'uploadAp' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [client, setClient] = useState<ClientItem>(() => initialClient)

  const [name, setName] = useState(() => initialClient.name ?? '')
  const [category, setCategory] = useState<string | null>(() => initialClient.category ?? null)
  const [theme, setTheme] = useState<Record<string, unknown>>(() => initialClient.theme ?? {})
  const [filters, setFilters] = useState<ClientFilterDef[]>(() => (initialClient.filters as ClientFilterDef[]) ?? [])
  const [logoFiles, setLogoFiles] = useState<RsuiteUploadFile[]>(() => makeUploadedFileList(initialClient.logoUrl, 'logo'))
  const [backgroundFiles, setBackgroundFiles] = useState<RsuiteUploadFile[]>(() => makeUploadedFileList(initialClient.backgroundUrl, 'background'))
  const [apFile, setApFile] = useState<File | null>(null)
  const [apResult, setApResult] = useState<ClientApUploadResponse | null>(null)
  const [apPoints, setApPoints] = useState<ShopPointItem[]>([])
  const [apPreviewError, setApPreviewError] = useState<string | null>(null)

  const presetKey = useMemo(() => ((category ?? 'other') as 'retail' | 'auto' | 'bank' | 'other'), [category])
  const isBusy = busyKind !== null
  const isSaving = busyKind === 'save'
  const isUploadingLogo = busyKind === 'uploadLogo'
  const isUploadingBackground = busyKind === 'uploadBackground'
  const isUploadingAp = busyKind === 'uploadAp'

  async function save () {
    setBusyKind('save')
    setError(null)
    try {
      const payload: UpdateClientRequest = {
        name: name.trim() || client.name,
        category: category ?? null,
        theme,
        filters,
      }
      await axiosMainRequest.patch(apiRoutes.clients.client(client.id), payload, {
        headers: getClientScopedHeaders(client.id),
      })
      onSaved()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
      setBusyKind(null)
    }
  }

  async function refreshClient () {
    try {
      const res = await axiosMainRequest.get<{ items: ClientItem[] }>(
        `${apiRoutes.clients.clients}?includeArchived=true`,
        { headers: getClientScopedHeaders(client.id) },
      )
      const next = (res.data.items ?? []).find((item) => item.id === client.id)
      if (!next) {
        setError('Клиент не найден в списке')
        return
      }
      setClient(next)
      setLogoFiles(makeUploadedFileList(next.logoUrl, 'logo'))
      setBackgroundFiles(makeUploadedFileList(next.backgroundUrl, 'background'))
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    }
  }

  const logoAction = `${MAIN_API}${apiRoutes.clients.logo(client.id)}`
  const backgroundAction = `${MAIN_API}${apiRoutes.clients.background(client.id)}`
  const uploaderHeaders = useMemo(() => {
    const accessToken = readAccessTokenFromStorage()
    return {
      Accept: 'application/json',
      'Accept-Language': 'ru',
      'X-Company-Id': client.id,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }
  }, [client.id])

  const logoDirectHref = client.logoUrl ? toAssetHref(client.logoUrl) : null
  const backgroundDirectHref = client.backgroundUrl ? toAssetHref(client.backgroundUrl) : null

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(() => logoDirectHref)
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<string | null>(() => backgroundDirectHref)

  useEffect(() => {
    let isCancelled = false
    let createdUrl: string | null = null

    async function run () {
      const href = logoDirectHref
      if (!href) {
        setLogoPreviewUrl(null)
        return
      }

      if (href.startsWith('blob:') || href.startsWith('data:')) {
        setLogoPreviewUrl(href)
        return
      }

      setLogoPreviewUrl(href)
      const next = await tryFetchImageObjectUrl(href)
      if (!next) return
      createdUrl = next
      if (isCancelled) {
        URL.revokeObjectURL(createdUrl)
        createdUrl = null
        return
      }
      setLogoPreviewUrl(createdUrl)
    }

    run()

    return () => {
      isCancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [client.logoUrl, logoDirectHref])

  useEffect(() => {
    let isCancelled = false
    let createdUrl: string | null = null

    async function run () {
      const href = backgroundDirectHref
      if (!href) {
        setBackgroundPreviewUrl(null)
        return
      }

      if (href.startsWith('blob:') || href.startsWith('data:')) {
        setBackgroundPreviewUrl(href)
        return
      }

      setBackgroundPreviewUrl(href)
      const next = await tryFetchImageObjectUrl(href)
      if (!next) return
      createdUrl = next
      if (isCancelled) {
        URL.revokeObjectURL(createdUrl)
        createdUrl = null
        return
      }
      setBackgroundPreviewUrl(createdUrl)
    }

    run()

    return () => {
      isCancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [client.backgroundUrl, backgroundDirectHref])

  const logoHref = logoPreviewUrl ?? logoDirectHref
  const backgroundHref = backgroundPreviewUrl ?? backgroundDirectHref

  useEffect(() => {
    const projectId = client.baseApProjectId
    if (!projectId) {
      setApPoints([])
      setApPreviewError(null)
      return
    }
    let isAlive = true
    setApPreviewError(null)
    axiosMainRequest
      .get<ShopPointsResponse>(apiRoutes.projects.addressbook(projectId), {
        headers: getClientScopedHeaders(client.id),
      })
      .then((res) => {
        if (!isAlive) return
        setApPoints((res.data.items ?? []).slice(0, 20))
      })
      .catch((err: unknown) => {
        if (!isAlive) return
        setApPoints([])
        setApPreviewError(getApiErrorMessage(err))
      })
    return () => {
      isAlive = false
    }
  }, [client.baseApProjectId, client.id])

  async function uploadAp () {
    if (!apFile) return
    setBusyKind('uploadAp')
    setError(null)
    setApResult(null)
    try {
      const fd = new FormData()
      fd.append('file', apFile)
      const res = await axiosMainRequest.post<ClientApUploadResponse>(apiRoutes.clients.apUpload(client.id), fd, {
        headers: {
          ...getClientScopedHeaders(client.id),
          'Content-Type': 'multipart/form-data',
        },
      })
      setApResult(res.data)
      setApFile(null)
      await refreshClient()
      onChanged?.()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusyKind(null)
    }
  }

  function applyThemePreset () {
    setTheme((p) => ({
      ...p,
      primary: '#2a7fff',
      accent: '#77dde7',
      gradientFrom: '#e6f0ff',
      gradientTo: '#f4fbff',
    }))
  }

  function clearTheme () {
    setTheme({})
  }

  return (
    <>
      <Modal.Body>
        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.grid}>
          <div className={styles.row}>
            <div className={styles.label}>Категория</div>
            <SelectPicker
              size='sm'
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
            <Input size='sm' value={name} onChange={(v) => setName(String(v ?? ''))} disabled={isBusy} />
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Адресная программа (АП)</div>
            {client.baseApProjectId ? (
              <div className={styles.row}>
                <div className={styles.hint}>
                  Загружена, projectId: <span className={styles.mono}>{client.baseApProjectId}</span>
                </div>
                {apPreviewError ? <div className={styles.error}>{apPreviewError}</div> : null}
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>code</th>
                        <th>name</th>
                        <th>address</th>
                        <th>city</th>
                        <th>region</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apPoints.map((point) => (
                        <tr key={point.id}>
                          <td>{point.code || '—'}</td>
                          <td>{point.pointName || point.chain?.name || '—'}</td>
                          <td>{point.address || '—'}</td>
                          <td>{point.cityName || '—'}</td>
                          <td>{point.regionCode || '—'}</td>
                        </tr>
                      ))}
                      {!apPoints.length ? (
                        <tr>
                          <td colSpan={5}>Точки АП пока не найдены</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className={styles.hint}>Не загружена</div>
            )}
            <div className={styles.inlineRow}>
              <input type="file" accept=".xlsx,.csv" onChange={(e) => setApFile(e.target.files?.[0] ?? null)} />
              <RsuiteButton appearance="subtle" size="sm" loading={isUploadingAp} disabled={isBusy || !apFile} onClick={uploadAp}>
                Загрузить/обновить АП
              </RsuiteButton>
            </div>
            {apResult ? <div className={styles.hint}>Создано: {apResult.created} · Обновлено: {apResult.updated}</div> : null}
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Лого</div>
            <div className={styles.inlineRow}>
              <Uploader
                action={logoAction}
                withCredentials
                disabled={isBusy}
                autoUpload
                multiple={false}
                accept="image/*"
                listType="picture-text"
                fileList={logoFiles}
                onChange={(next) => setLogoFiles(next as RsuiteUploadFile[])}
                onUpload={() => {
                  setError(null)
                  setBusyKind('uploadLogo')
                }}
                onSuccess={() => {
                  setBusyKind(null)
                  setLogoFiles([])
                  onChanged?.()
                  refreshClient()
                }}
                onError={(reason) => {
                  setBusyKind(null)
                  setError(getUploaderErrorMessage(reason))
                }}
                headers={uploaderHeaders}
                renderThumbnail={(file, thumbnail) => {
                  if (!logoPreviewUrl || file.status !== 'finished') return thumbnail
                  return (
                    <img
                      src={logoPreviewUrl}
                      alt=""
                      aria-hidden="true"
                      style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
                    />
                  )
                }}
              >
                <RsuiteButton appearance="subtle" size="sm" loading={isUploadingLogo}>
                  Загрузить лого
                </RsuiteButton>
              </Uploader>
              {logoHref ? (
                <button
                  type="button"
                  className={[styles.hint, styles.linkButton].filter(Boolean).join(' ')}
                  onClick={() => openImageInNewTab(logoHref)}
                  disabled={isBusy}
                >
                  Открыть
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Фон</div>
            <div className={styles.inlineRow}>
              <Uploader
                action={backgroundAction}
                withCredentials
                disabled={isBusy}
                autoUpload
                multiple={false}
                accept="image/*"
                listType="picture-text"
                fileList={backgroundFiles}
                onChange={(next) => setBackgroundFiles(next as RsuiteUploadFile[])}
                onUpload={() => {
                  setError(null)
                  setBusyKind('uploadBackground')
                }}
                onSuccess={() => {
                  setBusyKind(null)
                  setBackgroundFiles([])
                  onChanged?.()
                  refreshClient()
                }}
                onError={(reason) => {
                  setBusyKind(null)
                  setError(getUploaderErrorMessage(reason))
                }}
                headers={uploaderHeaders}
                renderThumbnail={(file, thumbnail) => {
                  if (!backgroundPreviewUrl || file.status !== 'finished') return thumbnail
                  return (
                    <img
                      src={backgroundPreviewUrl}
                      alt=""
                      aria-hidden="true"
                      style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
                    />
                  )
                }}
              >
                <RsuiteButton appearance="subtle" size="sm" loading={isUploadingBackground}>
                  Загрузить фон
                </RsuiteButton>
              </Uploader>
              {backgroundHref ? (
                <button
                  type="button"
                  className={[styles.hint, styles.linkButton].filter(Boolean).join(' ')}
                  onClick={() => openImageInNewTab(backgroundHref)}
                  disabled={isBusy}
                >
                  Открыть
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.sectionHeaderRow}>
              <div className={styles.label}>Цвета</div>
              <div className={styles.sectionActions}>
                <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={applyThemePreset}>
                  Пресет
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={clearTheme}>
                  Очистить
                </Button>
              </div>
            </div>
            <div className={styles.colorList}>
              <label className={styles.colorItem}>
                <span className={[styles.hint, styles.colorName].filter(Boolean).join(' ')}>Primary</span>
                <input
                  className={styles.colorInput}
                  type="color"
                  value={String(theme.primary ?? '#2a7fff')}
                  onChange={(e) => setTheme((p) => ({ ...p, primary: e.target.value }))}
                  disabled={isBusy}
                />
              </label>
              <label className={styles.colorItem}>
                <span className={[styles.hint, styles.colorName].filter(Boolean).join(' ')}>Accent</span>
                <input
                  className={styles.colorInput}
                  type="color"
                  value={String(theme.accent ?? '#77dde7')}
                  onChange={(e) => setTheme((p) => ({ ...p, accent: e.target.value }))}
                  disabled={isBusy}
                />
              </label>
              <label className={styles.colorItem}>
                <span className={[styles.hint, styles.colorName].filter(Boolean).join(' ')}>Gradient From</span>
                <input
                  className={styles.colorInput}
                  type="color"
                  value={String(theme.gradientFrom ?? '#e6f0ff')}
                  onChange={(e) => setTheme((p) => ({ ...p, gradientFrom: e.target.value }))}
                  disabled={isBusy}
                />
              </label>
              <label className={styles.colorItem}>
                <span className={[styles.hint, styles.colorName].filter(Boolean).join(' ')}>Gradient To</span>
                <input
                  className={styles.colorInput}
                  type="color"
                  value={String(theme.gradientTo ?? '#f4fbff')}
                  onChange={(e) => setTheme((p) => ({ ...p, gradientTo: e.target.value }))}
                  disabled={isBusy}
                />
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
            <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={onClose}>
              Закрыть
            </Button>
          </div>
          <div className={styles.footerRight}>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={isBusy}
              leftSlot={isSaving ? <Loader size="xs" inverse /> : null}
              onClick={save}
            >
              {isSaving ? 'Сохранение' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </>
  )
}

type RsuiteUploadFile = {
  name?: string
  fileKey?: number | string
  status?: 'inited' | 'uploading' | 'error' | 'finished'
  progress?: number
  url?: string
  blobFile?: File
}

function getUploaderErrorMessage (reason: unknown): string {
  if (typeof reason === 'string' && reason.trim()) return reason
  if (reason && typeof reason === 'object') {
    const message = (reason as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Ошибка загрузки файла'
}

function readAccessTokenFromStorage (): string | null {
  try {
    return window.localStorage.getItem('anketka_access_token')
  } catch {
    return null
  }
}

function makeUploadedFileList (url: string | null, name: string): RsuiteUploadFile[] {
  if (!url) return []
  return [{ name, status: 'finished', url: toAssetHref(url) }]
}

function toAssetHref (url: string): string {
  const v = String(url ?? '').trim()
  if (!v) return v
  if (/^(blob:|data:)/i.test(v)) return v
  if (/^https?:\/\//i.test(v)) return v

  const base = String(MAIN_API ?? '')
  if (!base) return v.startsWith('/') ? v : `/${v}`

  if (/^https?:\/\//i.test(base)) {
    try {
      const baseUrl = new URL(base)
      const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`
      const basePathNoSlash = basePath.startsWith('/') ? basePath.slice(1) : basePath
      if (v.startsWith('/')) return new URL(v, baseUrl.origin).toString()

      const rel = v.startsWith(basePathNoSlash) ? v.slice(basePathNoSlash.length) : v
      return new URL(rel, baseUrl.toString()).toString()
    } catch {
      // fallback below
    }
  }

  if (v.startsWith('/')) return v

  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const baseNoSlash = normalizedBase.startsWith('/') ? normalizedBase.slice(1) : normalizedBase
  if (v.startsWith(baseNoSlash)) return `/${v}`
  return `${normalizedBase}${v}`
}

async function tryFetchImageObjectUrl (href: string): Promise<string | null> {
  try {
    const res = await axiosMainRequest.get(href, {
      responseType: 'blob',
      headers: { Accept: 'image/*,*/*;q=0.8' },
    })

    const blob = res.data as Blob
    if (!blob) return null
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

function openImageInNewTab (href: string) {
  if (typeof window === 'undefined') return

  const safeHref = escapeHtmlAttr(String(href))

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Изображение</title>
    <style>
      html, body { height: 100%; margin: 0; background: #0b0f1a; }
      .wrap { height: 100%; display: grid; place-items: center; padding: 18px; }
      img { max-width: min(100%, 1200px); max-height: 100%; object-fit: contain; border-radius: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.45); background: #111827; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <img src="${safeHref}" alt="" />
    </div>
  </body>
</html>`

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const a = window.document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.click()

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function escapeHtmlAttr (value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function getClientScopedHeaders (clientId: string): Record<string, string> {
  return { 'X-Company-Id': clientId }
}

