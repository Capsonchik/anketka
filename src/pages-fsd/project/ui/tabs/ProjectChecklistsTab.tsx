import { useMemo, useState } from 'react'
import { Input, Modal, SelectPicker } from 'rsuite'

import type { ChecklistItemPublic } from '../../model/types'

import { apiRoutes } from '@/api-config/api-routes'

import styles from '../ProjectPage.module.css'
import { ProjectChecklistDetailsModal } from './ProjectChecklistDetailsModal'
import { ProjectChecklistUploadModal } from './ProjectChecklistUploadModal'
import { downloadApiFile } from '../../lib/downloadApiFile'

export function ProjectChecklistsTab ({
  projectId,
  checklistFile,
  onSelectFile,
  onUpload,
  isUploading,
  isMutating,
  onRename,
  onDelete,
  checklists,
  isChecklistsLoading,
  checklistsError,
}: {
  projectId: string
  checklistFile: File | null
  onSelectFile: (file: File | null) => void
  onUpload: () => void
  isUploading: boolean
  isMutating: boolean
  onRename: (checklistId: string, title: string) => void
  onDelete: (checklistId: string) => void
  checklists: ChecklistItemPublic[]
  isChecklistsLoading: boolean
  checklistsError: string | null
}) {
  const [chainId, setChainId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [active, setActive] = useState<ChecklistItemPublic | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<ChecklistItemPublic | null>(null)
  const [renameTitle, setRenameTitle] = useState('')

  const chainOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of checklists) {
      if (c.chain?.id) map.set(c.chain.id, c.chain.name)
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [checklists])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return checklists.filter((c) => {
      if (chainId && c.chain?.id !== chainId) return false
      if (!query) return true
      const hay = [c.chain?.name, c.title].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(query)
    })
  }, [chainId, checklists, q])

  return (
    <div className={styles.tabPanel}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Чек-листы</div>
          <div className={styles.formRow}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={async () => {
                setIsExporting(true)
                setExportError(null)
                try {
                  await downloadApiFile({
                    url: apiRoutes.projects.checklistsExport(projectId),
                    params: {
                      q: q.trim() || null,
                      chainId: chainId ?? null,
                      format: 'xlsx',
                    },
                    fallbackFilename: 'checklists.xlsx',
                    headers: {
                      accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    },
                  })
                } catch (err: unknown) {
                  setExportError(err instanceof Error ? err.message : 'Не удалось выгрузить Excel')
                } finally {
                  setIsExporting(false)
                }
              }}
              disabled={isChecklistsLoading || isExporting}
            >
              {isExporting ? 'Экспорт…' : 'Экспорт'}
            </button>
            <button type="button" className={styles.actionButton} onClick={() => setIsUploadOpen(true)} disabled={isUploading}>
              Импорт Excel
            </button>
          </div>
        </div>

        {isChecklistsLoading ? <div className={styles.hint} style={{ marginTop: 10 }}>Загрузка чек-листов…</div> : null}
        {checklistsError ? <div className={styles.error} style={{ marginTop: 10 }}>{checklistsError}</div> : null}
        {exportError ? <div className={styles.error} style={{ marginTop: 10 }}>Экспорт: {exportError}</div> : null}

        {checklists.length > 0 ? (
          <div className={styles.formRow} style={{ marginTop: 10 }}>
            <SelectPicker
              size="sm"
              value={chainId}
              onChange={(v) => setChainId((v as string | null) ?? null)}
              cleanable
              searchable
              placeholder="Сеть"
              data={chainOptions}
              style={{ minWidth: 240 }}
            />
            <Input
              size="sm"
              value={q}
              onChange={(v) => setQ(String(v ?? ''))}
              placeholder="Поиск по названию…"
              style={{ minWidth: 260, flex: 1 }}
            />
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Сеть</th>
                <th className={styles.th}>Название</th>
                <th className={styles.th}>Позиции</th>
                <th className={styles.th}>Создан</th>
                <th className={styles.th} style={{ width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setActive(c)
                    setIsOpen(true)
                  }}
                >
                  <td className={styles.td}>{c.chain?.name || '—'}</td>
                  <td className={styles.td}>{c.title}</td>
                  <td className={styles.td}>{c.itemsCount}</td>
                  <td className={styles.td}>{String(c.createdAt).slice(0, 10)}</td>
                  <td className={styles.td}>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Переименовать"
                        disabled={isMutating}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setRenameTarget(c)
                          setRenameTitle(c.title)
                        }}
                      >
                        <img src="/icons/edit.svg" width={16} height={16} alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                        aria-label="Удалить"
                        disabled={isMutating}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const ok = window.confirm('Удалить чек-лист? Позиции внутри будут удалены без возможности восстановления.')
                          if (!ok) return
                          onDelete(c.id)
                        }}
                      >
                        <img src="/icons/trash.svg" width={16} height={16} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !isChecklistsLoading ? (
                <tr>
                  <td className={styles.td} colSpan={5}>Нет чек-листов</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ProjectChecklistDetailsModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        projectId={projectId}
        checklist={active}
      />

      <ProjectChecklistUploadModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        file={checklistFile}
        onSelectFile={onSelectFile}
        onUpload={() => {
          onUpload()
          setIsUploadOpen(false)
        }}
        isUploading={isUploading}
      />

      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} size="sm">
        <Modal.Header>
          <Modal.Title>Переименовать чек-лист</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Input value={renameTitle} onChange={(v) => setRenameTitle(String(v ?? ''))} />
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className={styles.actionButton} onClick={() => setRenameTarget(null)} disabled={isMutating}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              if (!renameTarget) return
              onRename(renameTarget.id, renameTitle.trim())
              setRenameTarget(null)
            }}
            disabled={isMutating || renameTitle.trim().length === 0}
          >
            Сохранить
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
