'use client'

import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, DatePicker, Input, Modal, Radio, RadioGroup, SelectPicker } from 'rsuite'

import { AddressbookTemplateTable } from '@/shared/ui'

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
  const [selectedProjectType, setSelectedProjectType] = useState<'priceMonitoring' | 'mysteryShopper' | null>(null)
  const [step, setStep] = useState<'selectType' | 'details'>('selectType')

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      onEntered={() => {
        setSelectedProjectType(null)
        setStep('selectType')
      }}
    >
      <Modal.Header>
        <Modal.Title>Новый проект</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {step === 'selectType' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Выберите тип проекта</div>

            <ProjectTypeButton
              title="Ценовой мониторинг"
              description="Мониторинг цен по адресной программе, сбор данных и отчётность по периодам."
              disabled={false}
              isSelected={selectedProjectType === 'priceMonitoring'}
              onClick={() => setSelectedProjectType('priceMonitoring')}
            />

            <ProjectTypeButton
              title="Тайный покупатель"
              description="Скоро. Этот тип проекта будет доступен позже."
              disabled
              isSelected={selectedProjectType === 'mysteryShopper'}
              onClick={() => setSelectedProjectType('mysteryShopper')}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ценовой мониторинг</div>

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

                <div style={{ fontSize: 12, fontWeight: 600 }}>Шаблон адресной программы</div>
                <AddressbookTemplateTable />
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
        )}

        {submitError ? (
          <div style={{ marginTop: 10, color: 'rgba(218, 60, 60, 0.92)', fontWeight: 600, fontSize: 12 }}>
            {submitError}
          </div>
        ) : null}
        {submitSuccess ? (
          <div style={{ marginTop: 10, color: 'rgba(20, 140, 90, 0.92)', fontWeight: 600, fontSize: 12 }}>
            {submitSuccess}
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        {step === 'details' ? (
          <Button appearance="subtle" onClick={() => setStep('selectType')} disabled={isSubmitting}>
            Назад
          </Button>
        ) : (
          <Button
            appearance="primary"
            onClick={() => setStep('details')}
            disabled={isSubmitting || selectedProjectType !== 'priceMonitoring'}
          >
            Продолжить
          </Button>
        )}
        <Button appearance="subtle" onClick={onClose} disabled={isSubmitting}>
          Закрыть
        </Button>
        {step === 'details' ? (
          <Button appearance="primary" onClick={onSubmit} disabled={isSubmitting}>
            Создать
          </Button>
        ) : null}
      </Modal.Footer>
    </Modal>
  )
}

function Field ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  )
}

function TemplateTable () {
  return <AddressbookTemplateTable />
}

function ProjectTypeButton ({
  title,
  description,
  disabled,
  isSelected,
  onClick,
}: {
  title: string
  description: string
  disabled: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const base: CSSProperties = {
    width: '100%',
    textAlign: 'left',
    padding: '14px 14px',
    borderRadius: 12,
    border: isSelected ? '1px solid rgba(36, 99, 235, 0.35)' : '1px solid rgba(0,0,0,0.10)',
    background: isSelected ? 'rgba(36, 99, 235, 0.06)' : 'rgba(255,255,255,0.9)',
    display: 'grid',
    gap: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} style={base} aria-pressed={isSelected}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.62)', lineHeight: 1.55 }}>{description}</div>
    </button>
  )
}

