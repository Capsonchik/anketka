'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DatePicker, Input, Modal, SelectPicker } from 'rsuite'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { AuditorCreateRequest, AuditorImportResponse, AuditorItem, AuditorGender, AuditorsResponse } from '@/entities/auditor'
import { Button } from '@/shared/ui'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import styles from './TeamAuditorsTab.module.css'

type CreateAuditorFormState = {
  lastName: string
  firstName: string
  middleName: string
  phone: string
  email: string
  city: string
  birthDate: Date | null
  gender: AuditorGender | null
}

const initialForm: CreateAuditorFormState = {
  lastName: '',
  firstName: '',
  middleName: '',
  phone: '',
  email: '',
  city: '',
  birthDate: null,
  gender: null,
}

function toIsoDate (d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseIsoDate (value: string | null): Date | null {
  const s = String(value || '').trim()
  if (!s) return null
  const parts = s.split('-').map((x) => x.trim())
  if (parts.length !== 3) return null
  const [yyyy, mm, dd] = parts
  const y = Number(yyyy)
  const m = Number(mm)
  const d = Number(dd)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function genderLabel (gender: AuditorGender | null | undefined): string {
  if (gender === 'male') return 'м'
  if (gender === 'female') return 'ж'
  return '—'
}

function formatName (a: AuditorItem): string {
  return [a.lastName, a.firstName, a.middleName].filter(Boolean).join(' ')
}

export function TeamAuditorsTab ({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<AuditorItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateAuditorFormState>(initialForm)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editAuditorId, setEditAuditorId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CreateAuditorFormState>(initialForm)
  const [editPassword, setEditPassword] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<AuditorImportResponse | null>(null)
  const [selectedImportFileName, setSelectedImportFileName] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement | null>(null)

  const hasFilters = useMemo(() => search.trim().length > 0 || city.trim().length > 0, [city, search])

  async function load (opts?: { q?: string; city?: string }) {
    setIsLoading(true)
    setError(null)
    try {
      const q = (opts?.q ?? search).trim()
      const c = (opts?.city ?? city).trim()
      const params: Record<string, string> = {}
      if (q) params.q = q
      if (c) params.city = c

      const res = await axiosMainRequest.get<AuditorsResponse>(apiRoutes.auditors.auditors, { params })
      setItems(res.data.items ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      load({ q: search, city })
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, city])

  const isEmpty = !isLoading && !error && items.length === 0 && !hasFilters
  const isNoResults = !isLoading && !error && items.length === 0 && hasFilters

  function openCreate () {
    setCreateError(null)
    setCreateForm(initialForm)
    setIsCreateOpen(true)
  }

  function openEdit (a: AuditorItem) {
    setEditError(null)
    setEditAuditorId(a.id)
    setEditPassword('')
    setEditForm({
      lastName: a.lastName ?? '',
      firstName: a.firstName ?? '',
      middleName: a.middleName ?? '',
      phone: a.phone ?? '',
      email: a.email ?? '',
      city: a.city ?? '',
      birthDate: parseIsoDate(a.birthDate),
      gender: a.gender ?? null,
    })
    setIsEditOpen(true)
  }

  async function submitCreate () {
    if (!isAdmin) return

    setCreateError(null)

    const lastName = createForm.lastName.trim()
    const firstName = createForm.firstName.trim()
    const middleName = createForm.middleName.trim() || null
    const phone = createForm.phone.trim() || null
    const email = createForm.email.trim() || null
    const city = createForm.city.trim()
    const birthDate = createForm.birthDate
    const gender = createForm.gender

    if (!lastName || !firstName || !city || !birthDate || !gender) {
      setCreateError('Заполните обязательные поля')
      return
    }
    if (!phone && !email) {
      setCreateError('Укажите телефон или почту')
      return
    }

    const payload: AuditorCreateRequest = {
      lastName,
      firstName,
      middleName,
      phone,
      email,
      city,
      birthDate: toIsoDate(birthDate),
      gender,
    }

    setIsCreating(true)
    try {
      await axiosMainRequest.post(apiRoutes.auditors.auditors, payload)
      setIsCreateOpen(false)
      await load()
    } catch (err: unknown) {
      setCreateError(getApiErrorMessage(err))
    } finally {
      setIsCreating(false)
    }
  }

  async function submitEdit () {
    if (!isAdmin) return
    if (!editAuditorId) return

    setEditError(null)

    const lastName = editForm.lastName.trim()
    const firstName = editForm.firstName.trim()
    const middleName = editForm.middleName.trim() || null
    const phone = editForm.phone.trim() || null
    const email = editForm.email.trim() || null
    const city = editForm.city.trim()
    const birthDate = editForm.birthDate
    const gender = editForm.gender

    if (!lastName || !firstName || !city || !birthDate || !gender) {
      setEditError('Заполните обязательные поля')
      return
    }
    if (!phone && !email) {
      setEditError('Укажите телефон или почту')
      return
    }

    setIsEditing(true)
    try {
      await axiosMainRequest.patch(apiRoutes.auditors.auditor(editAuditorId), {
        lastName,
        firstName,
        middleName,
        phone,
        email,
        city,
        birthDate: toIsoDate(birthDate),
        gender,
      })

      const nextPassword = editPassword.trim()
      if (nextPassword) {
        await axiosMainRequest.post(apiRoutes.auditors.password(editAuditorId), { password: nextPassword })
      }

      setIsEditOpen(false)
      setEditAuditorId(null)
      setEditPassword('')
      await load()
    } catch (err: unknown) {
      setEditError(getApiErrorMessage(err))
    } finally {
      setIsEditing(false)
    }
  }

  async function deleteAuditor (auditorId: string) {
    if (!isAdmin) return
    const ok = window.confirm('Удалить аудитора?')
    if (!ok) return
    try {
      await axiosMainRequest.delete(apiRoutes.auditors.auditor(auditorId))
      await load()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    }
  }

  async function importXlsx (file: File) {
    if (!isAdmin) return
    setImportError(null)
    setImportResult(null)
    setIsImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axiosMainRequest.post<AuditorImportResponse>(apiRoutes.auditors.import, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(res.data)
      await load()
    } catch (err: unknown) {
      setImportError(getApiErrorMessage(err))
    } finally {
      setIsImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Аудиторы</div>
        <div className={styles.actions}>
          <input
            ref={fileRef}
            className={styles.fileInput}
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setSelectedImportFileName(f.name)
              importXlsx(f)
            }}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={!isAdmin || isImporting}
            onClick={() => {
              setImportError(null)
              setImportResult(null)
              setSelectedImportFileName(null)
              setIsImportOpen(true)
            }}
          >
            Импорт Excel
          </Button>
          <Button type="button" variant="primary" disabled={!isAdmin} onClick={openCreate}>
            Добавить аудитора
          </Button>
        </div>
      </div>

      <div className={styles.filters}>
        <Input
          size="sm"
          value={search}
          onChange={(v) => setSearch(String(v ?? ''))}
          placeholder="Поиск по ФИО / телефону / почте…"
        />
        <Input size="sm" value={city} onChange={(v) => setCity(String(v ?? ''))} placeholder="Город…" />
      </div>

      {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {isEmpty ? <div className={styles.hint}>Пока нет аудиторов</div> : null}
      {isNoResults ? <div className={styles.hint}>Ничего не найдено</div> : null}

      {importError ? <div className={styles.error}>{importError}</div> : null}
      {importResult ? (
        <div className={styles.importDetails}>
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

      {items.length ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ФИО</th>
              <th className={styles.th}>Контакты</th>
              <th className={styles.th}>Город</th>
              <th className={styles.th}>Дата рождения</th>
              <th className={styles.th}>Пол</th>
              <th className={styles.th} />
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td className={styles.td}>{formatName(a)}</td>
                <td className={styles.td}>
                  <div className={styles.mono}>{a.phone ?? '—'}</div>
                  <div className={styles.mono}>{a.email ?? '—'}</div>
                </td>
                <td className={styles.td}>{a.city}</td>
                <td className={styles.td}>
                  <span className={styles.mono}>{a.birthDate ?? '—'}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.mono}>{genderLabel(a.gender)}</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={!isAdmin}
                      onClick={() => openEdit(a)}
                      aria-label="Редактировать"
                      title="Редактировать"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`.trim()}
                      disabled={!isAdmin}
                      onClick={() => deleteAuditor(a.id)}
                      aria-label="Удалить"
                      title="Удалить"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <Modal open={isImportOpen} onClose={() => setIsImportOpen(false)} size="lg">
        <Modal.Header>
          <Modal.Title>Импорт аудиторов из Excel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className={styles.importSampleWrap}>
            <div className={styles.importNote}>
              Загрузите <span className={styles.mono}>.xlsx</span> с <b>строго</b> такими колонками (первая строка — заголовок):
              <div className={styles.mono} style={{ marginTop: 6 }}>
                Фамилия, Имя, Отчество, Телефон, Электронная почта, Город, Дата рождения, Пол
              </div>
              <div style={{ marginTop: 6 }}>
                Дата рождения: <span className={styles.mono}>ДД-ММ-ГГГГ</span> (например <span className={styles.mono}>21-08-1995</span>),
                пол: <span className={styles.mono}>м</span> / <span className={styles.mono}>ж</span>.
              </div>
            </div>

            <div className={styles.importTableWrap} aria-label="Пример файла для импорта">
              <table className={styles.importTable}>
                <thead>
                  <tr>
                    <th className={styles.importTh}>Фамилия</th>
                    <th className={styles.importTh}>Имя</th>
                    <th className={styles.importTh}>Отчество</th>
                    <th className={styles.importTh}>Телефон</th>
                    <th className={styles.importTh}>Электронная почта</th>
                    <th className={styles.importTh}>Город</th>
                    <th className={styles.importTh}>Дата рождения</th>
                    <th className={styles.importTh}>Пол</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles.importTd}>Иванов</td>
                    <td className={styles.importTd}>Иван</td>
                    <td className={styles.importTd}>Иванович</td>
                    <td className={styles.importTd}>+79990000000</td>
                    <td className={styles.importTd}>ivanov@example.com</td>
                    <td className={styles.importTd}>Москва</td>
                    <td className={styles.importTd}>21-08-1995</td>
                    <td className={styles.importTd}>м</td>
                  </tr>
                  <tr>
                    <td className={styles.importTd}>Петрова</td>
                    <td className={styles.importTd}>Анна</td>
                    <td className={styles.importTd}></td>
                    <td className={styles.importTd}></td>
                    <td className={styles.importTd}>anna.pet@example.com</td>
                    <td className={styles.importTd}>Казань</td>
                    <td className={styles.importTd}>10-02-1999</td>
                    <td className={styles.importTd}>ж</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={styles.fileLine}>
              <Button
                type="button"
                variant="primary"
                disabled={!isAdmin || isImporting}
                onClick={() => fileRef.current?.click()}
              >
                Выбрать файл .xlsx
              </Button>
              <div className={styles.fileName}>
                {selectedImportFileName ? (
                  <>
                    Выбран файл: <span className={styles.mono}>{selectedImportFileName}</span>
                  </>
                ) : (
                  'Файл не выбран'
                )}
              </div>
            </div>

            {isImporting ? <div className={styles.hint}>Импорт…</div> : null}
            {importError ? <div className={styles.error}>{importError}</div> : null}
            {importResult ? (
              <div className={styles.importDetails}>
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
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="ghost" onClick={() => setIsImportOpen(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} size="sm">
        <Modal.Header>
          <Modal.Title>Добавить аудитора</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'grid', gap: 10 }}>
            <Input
              value={createForm.lastName}
              onChange={(v) => setCreateForm((p) => ({ ...p, lastName: String(v ?? '') }))}
              placeholder="Фамилия *"
            />
            <Input
              value={createForm.firstName}
              onChange={(v) => setCreateForm((p) => ({ ...p, firstName: String(v ?? '') }))}
              placeholder="Имя *"
            />
            <Input
              value={createForm.middleName}
              onChange={(v) => setCreateForm((p) => ({ ...p, middleName: String(v ?? '') }))}
              placeholder="Отчество"
            />
            <Input
              value={createForm.phone}
              onChange={(v) => setCreateForm((p) => ({ ...p, phone: String(v ?? '') }))}
              placeholder="Телефон"
            />
            <Input
              value={createForm.email}
              onChange={(v) => setCreateForm((p) => ({ ...p, email: String(v ?? '') }))}
              placeholder="Электронная почта"
            />
            <Input
              value={createForm.city}
              onChange={(v) => setCreateForm((p) => ({ ...p, city: String(v ?? '') }))}
              placeholder="Город *"
            />
            <DatePicker
              oneTap
              value={createForm.birthDate}
              onChange={(v) => setCreateForm((p) => ({ ...p, birthDate: v ?? null }))}
              placeholder="Дата рождения *"
              format="dd.MM.yyyy"
              block
            />
            <SelectPicker
              value={createForm.gender}
              onChange={(v) => setCreateForm((p) => ({ ...p, gender: (v as AuditorGender | null) ?? null }))}
              placeholder="Пол *"
              cleanable={false}
              searchable={false}
              block
              data={[
                { label: 'Мужской', value: 'male' },
                { label: 'Женский', value: 'female' },
              ]}
            />
            {createError ? <div className={styles.error}>{createError}</div> : null}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
            Отмена
          </Button>
          <Button type="button" variant="primary" disabled={!isAdmin || isCreating} onClick={submitCreate}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} size="sm">
        <Modal.Header>
          <Modal.Title>Редактировать аудитора</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'grid', gap: 10 }}>
            <Input
              value={editForm.lastName}
              onChange={(v) => setEditForm((p) => ({ ...p, lastName: String(v ?? '') }))}
              placeholder="Фамилия *"
            />
            <Input
              value={editForm.firstName}
              onChange={(v) => setEditForm((p) => ({ ...p, firstName: String(v ?? '') }))}
              placeholder="Имя *"
            />
            <Input
              value={editForm.middleName}
              onChange={(v) => setEditForm((p) => ({ ...p, middleName: String(v ?? '') }))}
              placeholder="Отчество"
            />
            <Input
              value={editForm.phone}
              onChange={(v) => setEditForm((p) => ({ ...p, phone: String(v ?? '') }))}
              placeholder="Телефон"
            />
            <Input
              value={editForm.email}
              onChange={(v) => setEditForm((p) => ({ ...p, email: String(v ?? '') }))}
              placeholder="Электронная почта"
            />
            <Input
              value={editPassword}
              onChange={(v) => setEditPassword(String(v ?? ''))}
              placeholder="Пароль для входа (если нужно сменить)"
              type="password"
            />
            <Input
              value={editForm.city}
              onChange={(v) => setEditForm((p) => ({ ...p, city: String(v ?? '') }))}
              placeholder="Город *"
            />
            <DatePicker
              oneTap
              value={editForm.birthDate}
              onChange={(v) => setEditForm((p) => ({ ...p, birthDate: v ?? null }))}
              placeholder="Дата рождения *"
              format="dd.MM.yyyy"
              block
            />
            <SelectPicker
              value={editForm.gender}
              onChange={(v) => setEditForm((p) => ({ ...p, gender: (v as AuditorGender | null) ?? null }))}
              placeholder="Пол *"
              cleanable={false}
              searchable={false}
              block
              data={[
                { label: 'Мужской', value: 'male' },
                { label: 'Женский', value: 'female' },
              ]}
            />
            {editError ? <div className={styles.error}>{editError}</div> : null}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
            Отмена
          </Button>
          <Button type="button" variant="primary" disabled={!isAdmin || isEditing} onClick={submitEdit}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function PencilIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6m-8 4h10m-9 0 .7 14h6.6L16 7M10 11v7m4-7v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

