import { Button, Modal } from 'rsuite'

import styles from '../ProjectPage.module.css'

export function ProjectChecklistUploadModal ({
  open,
  onClose,
  file,
  onSelectFile,
  onUpload,
  isUploading,
}: {
  open: boolean
  onClose: () => void
  file: File | null
  onSelectFile: (file: File | null) => void
  onUpload: () => void
  isUploading: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Добавить чек-лист</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.hint}>
          Загрузите Excel/CSV с товарами. Если в файле несколько разных “Магазин” — будет создано несколько чек‑листов (по магазину/сети).
        </div>

        <div className={styles.formRow} style={{ marginTop: 10 }}>
          <input
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
          />
          <Button appearance="primary" onClick={onUpload} disabled={isUploading || !file}>
            Загрузить
          </Button>
        </div>

        <div className={styles.hint} style={{ marginTop: 12, marginBottom: 6 }}>Пример файла (первая строка — заголовки):</div>
        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th className={styles.th}>Магазин *</th>
                <th className={styles.th}>Категория *</th>
                <th className={styles.th}>Бренд *</th>
                <th className={styles.th}>Артикул</th>
                <th className={styles.th}>Название *</th>
                <th className={styles.th}>Размер</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.td}>МАГНИТ КОСМЕТИК</td>
                <td className={styles.td}>Колготки женские</td>
                <td className={styles.td}>Pierre Cardin</td>
                <td className={styles.td}>4000092873</td>
                <td className={styles.tdWrap}>Leopard 40</td>
                <td className={styles.td}>2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button appearance="subtle" onClick={onClose} disabled={isUploading}>
          Закрыть
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

