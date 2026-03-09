'use client'

import { Button, Input, Modal, SelectPicker } from 'rsuite'

import { userRoleOptions, type UserRole } from '@/entities/user'

export type CreateUserFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  note: string
}

export function TeamCreateUserModal ({
  open,
  onClose,
  isSubmitting,
  submitError,
  submitSuccess,
  form,
  onChange,
  onSubmitClose,
  onSubmitKeep,
}: {
  open: boolean
  onClose: () => void
  isSubmitting: boolean
  submitError: string | null
  submitSuccess: string | null
  form: CreateUserFormState
  onChange: (patch: Partial<CreateUserFormState>) => void
  onSubmitClose: () => void
  onSubmitKeep: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Новый участник</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Имя *">
            <Input value={form.firstName} onChange={(v) => onChange({ firstName: String(v ?? '') })} />
          </Field>

          <Field label="Фамилия *">
            <Input value={form.lastName} onChange={(v) => onChange({ lastName: String(v ?? '') })} />
          </Field>

          <Field label="Почта *">
            <Input
              type="email"
              value={form.email}
              onChange={(v) => onChange({ email: String(v ?? '') })}
              placeholder="user@example.com"
            />
          </Field>

          <Field label="Телефон">
            <Input
              value={form.phone}
              onChange={(v) => onChange({ phone: String(v ?? '') })}
              placeholder="+7…"
              inputMode="tel"
            />
          </Field>

          <Field label="Роль *">
            <SelectPicker
              value={form.role}
              onChange={(v) => onChange({ role: (v as UserRole) ?? 'manager' })}
              cleanable={false}
              searchable={false}
              block
              data={userRoleOptions}
            />
          </Field>

          <Field label="Заметка">
            <Input as="textarea" rows={3} value={form.note} onChange={(v) => onChange({ note: String(v ?? '') })} />
          </Field>
        </div>

        {submitError ? <div style={{ marginTop: 10, color: 'rgba(218, 60, 60, 0.92)', fontWeight: 750, fontSize: 12 }}>{submitError}</div> : null}
        {submitSuccess ? <div style={{ marginTop: 10, color: 'rgba(20, 140, 90, 0.92)', fontWeight: 750, fontSize: 12 }}>{submitSuccess}</div> : null}
      </Modal.Body>
      <Modal.Footer>
        <Button appearance="subtle" onClick={onClose} disabled={isSubmitting}>
          Закрыть
        </Button>
        <Button appearance="ghost" onClick={onSubmitKeep} disabled={isSubmitting}>
          Создать и добавить
        </Button>
        <Button appearance="primary" onClick={onSubmitClose} disabled={isSubmitting}>
          Создать
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

