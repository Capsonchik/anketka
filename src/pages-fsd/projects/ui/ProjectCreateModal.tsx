'use client'

import { Button, DatePicker, Input, Modal, Radio, RadioGroup, SelectPicker } from 'rsuite'

import type { ProjectItem, TeamUserItem } from '../model/types'

export type AddressbookMode = 'none' | 'uploadNew' | 'fromProject'

export type CreateProjectFormState = {
  name: string
  comment: string
  startDate: Date | null
  endDate: Date | null
  managerId: string | null
  addressbookMode: AddressbookMode
  addressbookFile: File | null
  addressbookSourceProjectId: string | null
}

export function ProjectCreateModal ({
  open,
  onClose,
  isSubmitting,
  submitError,
  submitSuccess,
  form,
  managers,
  projects,
  onChange,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  isSubmitting: boolean
  submitError: string | null
  submitSuccess: string | null
  form: CreateProjectFormState
  managers: TeamUserItem[]
  projects: ProjectItem[]
  onChange: (patch: Partial<CreateProjectFormState>) => void
  onSubmit: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Новый проект</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Название проекта *">
            <Input value={form.name} onChange={(v) => onChange({ name: String(v ?? '') })} />
          </Field>

          <Field label="Комментарий">
            <Input
              as="textarea"
              rows={3}
              value={form.comment}
              onChange={(v) => onChange({ comment: String(v ?? '') })}
            />
          </Field>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Дата начала *">
              <DatePicker
                value={form.startDate}
                onChange={(v) => onChange({ startDate: v ?? null })}
                oneTap
                block
                placeholder="Выберите дату"
              />
            </Field>
            <Field label="Дата окончания *">
              <DatePicker
                value={form.endDate}
                onChange={(v) => onChange({ endDate: v ?? null })}
                oneTap
                block
                placeholder="Выберите дату"
              />
            </Field>
          </div>

          <Field label="Ответственный *">
            <SelectPicker
              value={form.managerId}
              onChange={(v) => onChange({ managerId: (v as string | null) ?? null })}
              cleanable
              searchable
              block
              data={managers.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}`.trim() || u.email }))}
              placeholder="Выберите сотрудника"
            />
          </Field>

          <Field label="Справочник адресов">
            <RadioGroup
              inline={false}
              value={form.addressbookMode}
              onChange={(v) => onChange({ addressbookMode: (v as AddressbookMode) ?? 'none' })}
            >
              <Radio value="none">Пока не загружать</Radio>
              <Radio value="uploadNew">Создать новый справочник с адресами</Radio>
              <Radio value="fromProject">Загрузить справочник из другого проекта</Radio>
            </RadioGroup>
          </Field>

          {form.addressbookMode === 'uploadNew' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Загрузить Excel *">
                <input
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(e) => onChange({ addressbookFile: e.target.files?.[0] ?? null })}
                />
              </Field>

              <div style={{ fontSize: 12, fontWeight: 700 }}>Шаблон адресной программы</div>
              <TemplateTable />
            </div>
          ) : null}

          {form.addressbookMode === 'fromProject' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Проект-источник *">
                <SelectPicker
                  value={form.addressbookSourceProjectId}
                  onChange={(v) => onChange({ addressbookSourceProjectId: (v as string | null) ?? null })}
                  cleanable
                  searchable
                  block
                  data={projects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Выберите проект"
                />
              </Field>
            </div>
          ) : null}
        </div>

        {submitError ? (
          <div style={{ marginTop: 10, color: 'rgba(218, 60, 60, 0.92)', fontWeight: 750, fontSize: 12 }}>
            {submitError}
          </div>
        ) : null}
        {submitSuccess ? (
          <div style={{ marginTop: 10, color: 'rgba(20, 140, 90, 0.92)', fontWeight: 750, fontSize: 12 }}>
            {submitSuccess}
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button appearance="subtle" onClick={onClose} disabled={isSubmitting}>
          Закрыть
        </Button>
        <Button appearance="primary" onClick={onSubmit} disabled={isSubmitting}>
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

function TemplateTable () {
  const headerStyle: React.CSSProperties = {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    padding: '8px 10px',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    whiteSpace: 'nowrap',
  }

  const cellStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '8px 10px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    whiteSpace: 'nowrap',
  }

  const rows = [
    {
      name: 'ПОДРУЖКА',
      address: 'ул.Ленина',
      region: 'Московская область',
      city: 'Москва',
    },
    {
      name: 'ПОДРУЖКА',
      address: 'ул.Мира',
      region: 'Московская область',
      city: 'Москва',
    },
  ]

  return (
    <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
        <thead>
          <tr>
            <th style={headerStyle}>name</th>
            <th style={headerStyle}>address</th>
            <th style={headerStyle}>region</th>
            <th style={headerStyle}>city</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td style={cellStyle}>{r.name}</td>
              <td style={cellStyle}>{r.address}</td>
              <td style={cellStyle}>{r.region}</td>
              <td style={cellStyle}>{r.city}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

