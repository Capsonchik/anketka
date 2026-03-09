'use client'

import { useRef, useState } from 'react'
import { Modal } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import type { TeamUsersImportResponse } from '../model/types'

import styles from './TeamUsersImportModal.module.css'

export function TeamUsersImportModal ({
  open,
  onClose,
  disabled,
  onImported,
}: {
  open: boolean
  onClose: () => void
  disabled: boolean
  onImported: () => void | Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<TeamUsersImportResponse | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  async function importXlsx (file: File) {
    if (disabled) return
    setImportError(null)
    setImportResult(null)
    setIsImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axiosMainRequest.post<TeamUsersImportResponse>(`${apiRoutes.team.users}/import`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(res.data)
      await onImported()
    } catch (err: unknown) {
      setImportError(getApiErrorMessage(err))
    } finally {
      setIsImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Импорт участников из Excel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.note}>
          Загрузите <span className={styles.mono}>.xlsx</span> с первой строкой-заголовком и колонками:
          <div className={styles.mono} style={{ marginTop: 6 }}>
            Фамилия, Имя, Электронная почта, Телефон, Роль, Заметка
          </div>
          <div className={styles.hint} style={{ marginTop: 6 }}>
            Роль: <span className={styles.mono}>admin</span>, <span className={styles.mono}>manager</span>,{' '}
            <span className={styles.mono}>controller</span>, <span className={styles.mono}>coordinator</span>,{' '}
            <span className={styles.mono}>auditor</span>
          </div>
        </div>

        <div className={styles.sampleWrap} aria-label="Пример шаблона">
          <table className={styles.sampleTable}>
            <thead>
              <tr>
                <th>Фамилия</th>
                <th>Имя</th>
                <th>Электронная почта</th>
                <th>Телефон</th>
                <th>Роль</th>
                <th>Заметка</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Иванов</td>
                <td>Иван</td>
                <td>ivanov@example.com</td>
                <td>+79990000000</td>
                <td>manager</td>
                <td />
              </tr>
              <tr>
                <td>Петрова</td>
                <td>Анна</td>
                <td>anna.pet@example.com</td>
                <td />
                <td>auditor</td>
                <td>Доступ до конца месяца</td>
              </tr>
            </tbody>
          </table>
        </div>

        <input
          ref={fileRef}
          className={styles.fileInput}
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setSelectedFileName(f.name)
            importXlsx(f)
          }}
        />

        <div className={styles.fileLine}>
          <button
            type="button"
            className={styles.pickButton}
            disabled={disabled || isImporting}
            onClick={() => fileRef.current?.click()}
          >
            Выбрать файл .xlsx
          </button>
          <div className={styles.fileName}>
            {selectedFileName ? (
              <>
                Выбран файл: <span className={styles.mono}>{selectedFileName}</span>
              </>
            ) : (
              'Файл не выбран'
            )}
          </div>
        </div>

        {isImporting ? <div className={styles.hint}>Импорт…</div> : null}
        {importError ? <div className={styles.error}>{importError}</div> : null}
        {importResult ? (
          <div className={styles.result}>
            <div className={styles.success}>
              Импорт завершён: создано {importResult.created}, пропущено {importResult.skipped}
            </div>
            {importResult.errors?.length ? (
              <div className={styles.errorList}>
                {importResult.errors.slice(0, 50).map((e, idx) => (
                  <div key={`${e.row}-${idx}`} className={styles.errorLine}>
                    <span className={styles.mono}>row {e.row}</span> — {e.message}
                  </div>
                ))}
                {importResult.errors.length > 50 ? <div className={styles.hint}>Показаны первые 50 ошибок</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Закрыть
        </button>
      </Modal.Footer>
    </Modal>
  )
}

