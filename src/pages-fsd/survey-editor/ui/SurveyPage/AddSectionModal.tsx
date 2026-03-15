'use client'

import { Input, Modal, SelectPicker } from 'rsuite'

import styles from '../SurveyPage.module.css'

type AddSectionModalProps = {
  open: boolean
  isAdding: boolean
  title: string
  sectionType: 'regular' | 'loop'
  onClose: () => void
  onTitleChange: (value: string) => void
  onSectionTypeChange: (value: 'regular' | 'loop') => void
  onSubmit: () => void
}

export function AddSectionModal ({
  open,
  isAdding,
  title,
  sectionType,
  onClose,
  onTitleChange,
  onSectionTypeChange,
  onSubmit,
}: AddSectionModalProps) {
  return (
    <Modal open={open} onClose={() => !isAdding && onClose()} size="xs">
      <Modal.Header>
        <Modal.Title>Добавить секцию</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Название *</div>
            <Input value={title} onChange={(v) => onTitleChange(String(v ?? ''))} placeholder="Например: Скрининг" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Тип</div>
            <SelectPicker
              value={sectionType}
              onChange={(v) => onSectionTypeChange((v as 'regular' | 'loop') ?? 'regular')}
              data={[
                { value: 'regular', label: 'Обычная' },
                { value: 'loop', label: 'Цикличная (повтор по элементам)' },
              ]}
              cleanable={false}
              searchable={false}
              block
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.modalFooterActions}>
          <button type="button" className={styles.headerTextButton} onClick={onClose} disabled={isAdding}>
            Отмена
          </button>
          <button type="button" className={styles.headerTextButton} onClick={onSubmit} disabled={isAdding}>
            Добавить
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
