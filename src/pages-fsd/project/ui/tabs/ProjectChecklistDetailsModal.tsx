import { useEffect, useMemo, useState } from 'react'
import { Input, Modal, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'

import type { ChecklistDetailsResponse, ChecklistItemPublic, ChecklistItemCreateRequest, ChecklistItemUpdateRequest } from '../../model/types'
import styles from '../ProjectPage.module.css'
import { ProjectChecklistAddItemModal } from './ProjectChecklistAddItemModal'
import { downloadApiFile } from '../../lib/downloadApiFile'

export function ProjectChecklistDetailsModal ({
  open,
  onClose,
  projectId,
  checklist,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  checklist: ChecklistItemPublic | null
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<ChecklistDetailsResponse | null>(null)
  const [isMutatingItem, setIsMutatingItem] = useState(false)

  const [brand, setBrand] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ChecklistItemUpdateRequest | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  useEffect(() => {
    if (!open || !checklist) return
    setIsLoading(true)
    setError(null)
    setDetails(null)
    setBrand(null)
    setCategory(null)
    setQ('')
    setEditItemId(null)
    setDraft(null)

    ;(async () => {
      try {
        const res = await axiosMainRequest.get<ChecklistDetailsResponse>(
          apiRoutes.projects.checklistDetails(projectId, checklist.id),
        )
        setDetails(res.data)
      } catch {
        setError('Не удалось загрузить содержимое чек-листа')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [checklist, open, projectId])

  const brandOptions = useMemo(() => {
    const set = new Set<string>()
    for (const it of details?.items ?? []) set.add(it.brand)
    return Array.from(set).sort().map((x) => ({ value: x, label: x }))
  }, [details?.items])

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const it of details?.items ?? []) set.add(it.category)
    return Array.from(set).sort().map((x) => ({ value: x, label: x }))
  }, [details?.items])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return (details?.items ?? []).filter((it) => {
      if (brand && it.brand !== brand) return false
      if (category && it.category !== category) return false
      if (!query) return true
      const hay = [it.category, it.brand, it.article, it.name, it.size].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(query)
    })
  }, [brand, category, details?.items, q])

  return (
    <>
      <Modal open={open} onClose={onClose} size="lg">
        <Modal.Header>
          <Modal.Title>
            {checklist ? `${checklist.chain?.name || '—'} · ${checklist.title}` : 'Чек-лист'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}

          {details ? (
            <>
              <div className={styles.formRow} style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Добавить позицию"
                  disabled={!checklist || isMutatingItem}
                  onClick={() => setIsAddOpen(true)}
                >
                  <PlusIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={async () => {
                    if (!checklist) return
                    setIsExporting(true)
                    try {
                      await downloadApiFile({
                        url: apiRoutes.projects.checklistItemsExport(projectId, checklist.id),
                        params: {
                          q: q.trim() || null,
                          brand: brand ?? null,
                          category: category ?? null,
                        },
                        fallbackFilename: 'checklist-items.xlsx',
                      })
                    } finally {
                      setIsExporting(false)
                    }
                  }}
                  disabled={!checklist || isExporting}
                >
                  {isExporting ? 'Экспорт…' : 'Экспорт'}
                </button>
                <SelectPicker
                  size="sm"
                  value={brand}
                  onChange={(v) => setBrand((v as string | null) ?? null)}
                  cleanable
                  searchable
                  placeholder="Бренд"
                  data={brandOptions}
                  style={{ minWidth: 220 }}
                />
                <SelectPicker
                  size="sm"
                  value={category}
                  onChange={(v) => setCategory((v as string | null) ?? null)}
                  cleanable
                  searchable
                  placeholder="Категория"
                  data={categoryOptions}
                  style={{ minWidth: 220 }}
                />
                <Input
                  size="sm"
                  value={q}
                  onChange={(v) => setQ(String(v ?? ''))}
                  placeholder="Поиск по позиции…"
                  style={{ minWidth: 260, flex: 1 }}
                />
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Категория</th>
                      <th className={styles.th}>Бренд</th>
                      <th className={styles.th}>Артикул</th>
                      <th className={styles.th}>Название</th>
                      <th className={styles.th}>Размер</th>
                      <th className={styles.th} style={{ width: 96 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((it) => (
                      <tr key={it.itemId}>
                        {editItemId === it.itemId && draft ? (
                          <>
                            <td className={styles.td}>
                              <Input size="sm" value={draft.category} onChange={(v) => setDraft({ ...draft, category: String(v ?? '') })} />
                            </td>
                            <td className={styles.td}>
                              <Input size="sm" value={draft.brand} onChange={(v) => setDraft({ ...draft, brand: String(v ?? '') })} />
                            </td>
                            <td className={styles.td}>
                              <Input size="sm" value={draft.article ?? ''} onChange={(v) => setDraft({ ...draft, article: String(v ?? '') || null })} />
                            </td>
                            <td className={styles.tdWrap}>
                              <Input size="sm" value={draft.name} onChange={(v) => setDraft({ ...draft, name: String(v ?? '') })} />
                            </td>
                            <td className={styles.td}>
                              <Input size="sm" value={draft.size ?? ''} onChange={(v) => setDraft({ ...draft, size: String(v ?? '') || null })} />
                            </td>
                            <td className={styles.td}>
                              <div className={styles.rowActions}>
                                <button
                                  type="button"
                                  className={styles.iconButton}
                                  aria-label="Сохранить"
                                  disabled={isMutatingItem || !checklist || draft.category.trim() === '' || draft.brand.trim() === '' || draft.name.trim() === ''}
                                  onClick={async () => {
                                    if (!checklist) return
                                    setIsMutatingItem(true)
                                    setError(null)
                                    try {
                                      await axiosMainRequest.patch(
                                        apiRoutes.projects.checklistItem(projectId, checklist.id, it.itemId),
                                        {
                                          sortOrder: draft.sortOrder ?? null,
                                          category: draft.category,
                                          brand: draft.brand,
                                          article: draft.article ?? null,
                                          name: draft.name,
                                          size: draft.size ?? null,
                                        },
                                      )
                                      const res = await axiosMainRequest.get<ChecklistDetailsResponse>(
                                        apiRoutes.projects.checklistDetails(projectId, checklist.id),
                                      )
                                      setDetails(res.data)
                                      setEditItemId(null)
                                      setDraft(null)
                                    } catch {
                                      setError('Не удалось обновить строку')
                                    } finally {
                                      setIsMutatingItem(false)
                                    }
                                  }}
                                >
                                  <CheckIcon />
                                </button>
                                <button
                                  type="button"
                                  className={styles.iconButton}
                                  aria-label="Отмена"
                                  disabled={isMutatingItem}
                                  onClick={() => {
                                    setEditItemId(null)
                                    setDraft(null)
                                  }}
                                >
                                  <CloseIcon />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={styles.td}>{it.category}</td>
                            <td className={styles.td}>{it.brand}</td>
                            <td className={styles.td}>{it.article || '—'}</td>
                            <td className={styles.tdWrap}>{it.name}</td>
                            <td className={styles.td}>{it.size || '—'}</td>
                            <td className={styles.td}>
                              <div className={styles.rowActions}>
                                <button
                                  type="button"
                                  className={styles.iconButton}
                                  aria-label="Редактировать"
                                  disabled={isMutatingItem}
                                  onClick={() => {
                                    setEditItemId(it.itemId)
                                    setDraft({
                                      sortOrder: it.sortOrder,
                                      category: it.category,
                                      brand: it.brand,
                                      article: it.article,
                                      name: it.name,
                                      size: it.size,
                                    })
                                  }}
                                >
                                  <img src="/icons/edit.svg" width={16} height={16} alt="" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                                  aria-label="Удалить"
                                  disabled={isMutatingItem || !checklist}
                                  onClick={async () => {
                                    if (!checklist) return
                                    const ok = window.confirm('Удалить строку из чек-листа?')
                                    if (!ok) return
                                    setIsMutatingItem(true)
                                    setError(null)
                                    try {
                                      await axiosMainRequest.delete(apiRoutes.projects.checklistItem(projectId, checklist.id, it.itemId))
                                      const res = await axiosMainRequest.get<ChecklistDetailsResponse>(
                                        apiRoutes.projects.checklistDetails(projectId, checklist.id),
                                      )
                                      setDetails(res.data)
                                    } catch {
                                      setError('Не удалось удалить строку')
                                    } finally {
                                      setIsMutatingItem(false)
                                    }
                                  }}
                                >
                                  <img src="/icons/trash.svg" width={16} height={16} alt="" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td className={styles.td} colSpan={6}>Нет позиций</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </Modal.Body>
      </Modal>

      <ProjectChecklistAddItemModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        isSubmitting={isMutatingItem}
        onSubmit={async (payload: ChecklistItemCreateRequest) => {
          if (!checklist) return
          setIsMutatingItem(true)
          setError(null)
          try {
            await axiosMainRequest.post(apiRoutes.projects.checklistItems(projectId, checklist.id), payload)
            const res = await axiosMainRequest.get<ChecklistDetailsResponse>(
              apiRoutes.projects.checklistDetails(projectId, checklist.id),
            )
            setDetails(res.data)
            setIsAddOpen(false)
          } catch {
            setError('Не удалось добавить позицию')
          } finally {
            setIsMutatingItem(false)
          }
        }}
      />
    </>
  )
}

function CheckIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

