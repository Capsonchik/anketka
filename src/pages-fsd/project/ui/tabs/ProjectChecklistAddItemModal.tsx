import { useMemo, useState } from 'react'
import { Button, Input, Modal } from 'rsuite'

import type { ChecklistItemCreateRequest } from '../../model/types'

export function ProjectChecklistAddItemModal ({
  open,
  onClose,
  isSubmitting,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  isSubmitting: boolean
  onSubmit: (payload: ChecklistItemCreateRequest) => void
}) {
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [article, setArticle] = useState('')
  const [name, setName] = useState('')
  const [size, setSize] = useState('')

  const canSubmit = useMemo(() => {
    return category.trim() && brand.trim() && name.trim() && !isSubmitting
  }, [brand, category, isSubmitting, name])

  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Добавить позицию</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Категория *">
            <Input value={category} onChange={(v) => setCategory(String(v ?? ''))} />
          </Field>
          <Field label="Бренд *">
            <Input value={brand} onChange={(v) => setBrand(String(v ?? ''))} />
          </Field>
          <Field label="Артикул">
            <Input value={article} onChange={(v) => setArticle(String(v ?? ''))} />
          </Field>
          <Field label="Название *">
            <Input value={name} onChange={(v) => setName(String(v ?? ''))} />
          </Field>
          <Field label="Размер">
            <Input value={size} onChange={(v) => setSize(String(v ?? ''))} />
          </Field>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button appearance="subtle" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button
          appearance="primary"
          disabled={!canSubmit}
          onClick={() => onSubmit({
            category: category.trim(),
            brand: brand.trim(),
            article: article.trim() || null,
            name: name.trim(),
            size: size.trim() || null,
          })}
        >
          Добавить
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function Field ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
      {children}
    </div>
  )
}

