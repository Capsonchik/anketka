import { Input, SelectPicker } from 'rsuite'

import { userRoleOptions, type UserRole } from '@/entities/user'
import type { UserPointAccessResponse, UserProjectAccessResponse } from '../../model/types'
import type { TeamUser } from '../../model/types'

import styles from './TeamUserModal.module.css'
import { Field, FieldEdit } from './TeamUserModalFields'

type TeamUserForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  profileCompany: string
  uiLanguage: string
  isActive: boolean
  permissions: string[]
  groupIds: string[]
  note: string
  password: string
}

function accessRoleLabel (role: 'controller' | 'coordinator') {
  return role === 'controller' ? 'Контролер' : 'Координатор'
}

function regionsLabel (codes: string[]) {
  if (!codes.length) return 'Не заданы'
  if (codes.includes('*')) return 'Все регионы'
  return codes.join(', ')
}

function shortId (id: string) {
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

export function TeamUserModalProfileTab ({
  actualMode,
  user,
  companyName,
  access,
  accessError,
  pointsAccess,
  pointsAccessError,
  password,
  resetPassword,
  form,
  onFormChange,
  onRoleChange,
  formatDateTime,
}: {
  actualMode: 'view' | 'edit'
  user: TeamUser
  companyName: string
  access: UserProjectAccessResponse | null
  accessError: string | null
  pointsAccess: UserPointAccessResponse | null
  pointsAccessError: string | null
  password: string | null
  resetPassword: string | null
  form: TeamUserForm
  onFormChange: (next: TeamUserForm) => void
  onRoleChange: (role: UserRole) => void
  formatDateTime: (value: string | null | undefined) => string
}) {
  if (actualMode === 'view') {
    const accessValue = access?.items?.length ? (
      <div style={{ display: 'grid', gap: 8 }}>
        {access.items.map((item) => (
          <div
            key={`${item.projectId}-${item.accessRole}`}
            style={{
              display: 'grid',
              gap: 4,
              padding: '8px 10px',
              border: '1px solid rgba(10, 30, 60, 0.08)',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.7)',
            }}
          >
            <div className={styles.value}>Роль: {accessRoleLabel(item.accessRole)}</div>
            <div className={styles.hint} title={item.projectId}>
              Проект: {item.projectName?.trim() ? item.projectName : shortId(item.projectId)}
            </div>
            <div className={styles.hint}>Регионы: {regionsLabel(item.regionCodes ?? [])}</div>
          </div>
        ))}
      </div>
    ) : '—'

    return (
      <div className={styles.grid}>
        <div className={styles.fullName}>
          {user.firstName} {user.lastName}
        </div>
        <Field label="Компания" value={companyName} />
        <Field label="Компания (профиль)" value={user.profileCompany || '—'} />
        <Field label="Почта" value={user.email} isMonospace />
        <Field label="Телефон" value={user.phone || '—'} isMonospace />
        <Field label="Язык интерфейса" value={user.uiLanguage || 'ru'} isMonospace />
        <Field label="Активен" value={user.isActive ? 'Да' : 'Нет'} />
        <Field label="Заметка" value={user.note || '—'} />
        <Field label="Создан" value={formatDateTime(user.createdAt)} isMonospace />
        <Field label="Последний вход" value={formatDateTime(user.lastLoginAt)} isMonospace />
        {accessError ? <Field label="Доступы" value="ошибка" /> : null}
        {!accessError ? (
          <Field
            label="Доступы"
            value={accessValue}
          />
        ) : null}
        {pointsAccessError ? <Field label="Локации" value="ошибка" /> : null}
        {!pointsAccessError ? (
          <Field
            label="Локации"
            value={pointsAccess?.pointIds?.length ? `Точек: ${pointsAccess.pointIds.length}` : '—'}
          />
        ) : null}
        {password ? <Field label="Временный пароль" value={password} isMonospace /> : null}
        {resetPassword ? <Field label="Новый пароль" value={resetPassword} isMonospace /> : null}
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      <FieldEdit label="Имя *">
        <Input value={form.firstName} onChange={(v) => onFormChange({ ...form, firstName: String(v ?? '') })} />
      </FieldEdit>
      <FieldEdit label="Фамилия *">
        <Input value={form.lastName} onChange={(v) => onFormChange({ ...form, lastName: String(v ?? '') })} />
      </FieldEdit>
      <FieldEdit label="Почта *">
        <Input
          type="email"
          value={form.email}
          onChange={(v) => onFormChange({ ...form, email: String(v ?? '') })}
          placeholder="user@example.com"
        />
      </FieldEdit>
      <FieldEdit label="Телефон">
        <Input
          value={form.phone}
          onChange={(v) => onFormChange({ ...form, phone: String(v ?? '') })}
          placeholder="+7..."
          inputMode="tel"
        />
      </FieldEdit>
      <FieldEdit label="Компания (профиль)">
        <Input value={form.profileCompany} onChange={(v) => onFormChange({ ...form, profileCompany: String(v ?? '') })} />
      </FieldEdit>
      <FieldEdit label="Роль *">
        <SelectPicker
          value={form.role}
          onChange={(v) => {
            const nextRole = ((v as UserRole) ?? 'manager')
            onRoleChange(nextRole)
          }}
          cleanable={false}
          searchable={false}
          block
          data={userRoleOptions}
        />
      </FieldEdit>
      <FieldEdit label="Язык интерфейса">
        <SelectPicker
          value={form.uiLanguage}
          onChange={(v) => onFormChange({ ...form, uiLanguage: String(v ?? 'ru') })}
          cleanable={false}
          searchable={false}
          block
          data={[
            { label: 'ru', value: 'ru' },
            { label: 'en', value: 'en' },
          ]}
        />
      </FieldEdit>
      <FieldEdit label="Активен">
        <SelectPicker
          value={form.isActive ? 'true' : 'false'}
          onChange={(v) => onFormChange({ ...form, isActive: String(v ?? 'true') === 'true' })}
          cleanable={false}
          searchable={false}
          block
          data={[
            { label: 'Да', value: 'true' },
            { label: 'Нет', value: 'false' },
          ]}
        />
      </FieldEdit>
      <FieldEdit label="Заметка">
        <Input
          as="textarea"
          rows={3}
          value={form.note}
          onChange={(v) => onFormChange({ ...form, note: String(v ?? '') })}
        />
      </FieldEdit>
      <FieldEdit label="Пароль (опционально)">
        <Input
          type="password"
          value={form.password}
          onChange={(v) => onFormChange({ ...form, password: String(v ?? '') })}
          placeholder="Оставьте пустым, чтобы не менять"
        />
      </FieldEdit>
    </div>
  )
}
