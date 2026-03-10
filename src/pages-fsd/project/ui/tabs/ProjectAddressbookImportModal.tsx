import { useRef, useState } from 'react'
import { Modal } from 'rsuite'

import { AddressbookTemplateTable } from '@/shared/ui'

import styles from '../ProjectPage.module.css'

export function ProjectAddressbookImportModal ({
  open,
  onClose,
  disabled,
  isUploading,
  onSelectFile,
  onUpload,
}: {
  open: boolean
  onClose: () => void
  disabled: boolean
  isUploading: boolean
  onSelectFile: (file: File | null) => void
  onUpload: () => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Импорт адресной программы</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.hintSoft}>
          Выберите файл <span style={{ fontWeight: 600 }}>.xlsx</span> или <span style={{ fontWeight: 600 }}>.csv</span> — загрузка начнётся автоматически.
          <br />
          Колонка <span style={{ fontWeight: 600 }}>code</span> (код точки) — опционально. Если не заполнена, код будет сгенерирован автоматически.
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setSelectedFileName(f.name)
            onSelectFile(f)
            window.setTimeout(() => onUpload(), 0)
          }}
        />

        <div className={styles.formRow} style={{ marginTop: 10 }}>
          <button
            type="button"
            className={styles.actionButton}
            disabled={disabled || isUploading}
            onClick={() => fileRef.current?.click()}
          >
            Импорт Excel/CSV
          </button>
          <div className={styles.hintSoft} style={{ marginTop: 0 }}>
            {selectedFileName ? `Выбран файл: ${selectedFileName}` : 'Файл не выбран'}
          </div>
        </div>

        {isUploading ? <div className={styles.hintSoft} style={{ marginTop: 10 }}>Импорт…</div> : null}

        <div className={styles.hintSoft} style={{ marginTop: 12, marginBottom: 6 }}>
          Пример файла (первая строка — заголовки):
        </div>
        <AddressbookTemplateTable />
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className={styles.actionButton} onClick={onClose} disabled={isUploading}>
          Закрыть
        </button>
      </Modal.Footer>
    </Modal>
  )
}

