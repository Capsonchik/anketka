import { useRef, useState } from 'react'
import { Modal } from 'rsuite'

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
        <div className={styles.hint}>
          Выберите файл <b>.xlsx</b> или <b>.csv</b> и он будет загружен автоматически.
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
          <div className={styles.hint} style={{ marginTop: 0 }}>
            {selectedFileName ? `Выбран файл: ${selectedFileName}` : 'Файл не выбран'}
          </div>
        </div>

        {isUploading ? <div className={styles.hint} style={{ marginTop: 10 }}>Импорт…</div> : null}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className={styles.actionButton} onClick={onClose} disabled={isUploading}>
          Закрыть
        </button>
      </Modal.Footer>
    </Modal>
  )
}

