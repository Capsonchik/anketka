'use client'

import { useEffect, useMemo, useState } from 'react'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { userRoleLabels, userRoles, type UserRole } from '@/entities/user'

import styles from './PermissionsPage.module.css'

type PermissionItem = {
  key: string
  label: string
}

type RoleDefaultsResponse = {
  byRole: Record<UserRole, string[]>
  availablePermissions: PermissionItem[]
}

function getApiErrorMessage (err: unknown): string {
  if (typeof err === 'object' && err) {
    const response = (err as { response?: unknown }).response
    if (typeof response === 'object' && response) {
      const data = (response as { data?: unknown }).data
      const detail = (data as { detail?: unknown } | undefined)?.detail
      if (typeof detail === 'string' && detail.trim()) return detail
    }
  }
  if (err instanceof Error && err.message) return err.message
  return 'Ошибка запроса'
}

function cloneRoleMap (input: Record<UserRole, string[]>): Record<UserRole, string[]> {
  return Object.fromEntries(userRoles.map((role) => [role, [...(input[role] || [])]])) as Record<UserRole, string[]>
}

export function PermissionsPage () {
  const [selectedRole, setSelectedRole] = useState<UserRole>('coordinator')
  const [availablePermissions, setAvailablePermissions] = useState<PermissionItem[]>([])
  const [savedByRole, setSavedByRole] = useState<Record<UserRole, string[]> | null>(null)
  const [draftByRole, setDraftByRole] = useState<Record<UserRole, string[]> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedSet = useMemo(
    () => new Set((draftByRole?.[selectedRole] || []).map((x) => String(x).trim()).filter(Boolean)),
    [draftByRole, selectedRole],
  )

  const hasUnsavedChanges = useMemo(() => {
    if (!savedByRole || !draftByRole) return false
    return JSON.stringify(savedByRole) !== JSON.stringify(draftByRole)
  }, [savedByRole, draftByRole])

  useEffect(() => {
    let isAlive = true
    setIsLoading(true)
    setError(null)
    axiosMainRequest
      .get<RoleDefaultsResponse>(apiRoutes.team.roleDefaultPermissions)
      .then((res) => {
        if (!isAlive) return
        const byRole = cloneRoleMap(res.data.byRole)
        setAvailablePermissions(res.data.availablePermissions || [])
        setSavedByRole(byRole)
        setDraftByRole(cloneRoleMap(byRole))
      })
      .catch((err: unknown) => {
        if (!isAlive) return
        setError(getApiErrorMessage(err))
      })
      .finally(() => {
        if (!isAlive) return
        setIsLoading(false)
      })
    return () => {
      isAlive = false
    }
  }, [])

  function togglePermission (permissionKey: string) {
    setDraftByRole((prev) => {
      if (!prev) return prev
      const next = cloneRoleMap(prev)
      const current = new Set(next[selectedRole] || [])
      if (current.has(permissionKey)) {
        current.delete(permissionKey)
      } else {
        current.add(permissionKey)
      }
      next[selectedRole] = Array.from(current)
      return next
    })
    setSuccess(null)
  }

  async function save () {
    if (!draftByRole) return
    setError(null)
    setSuccess(null)
    setIsSaving(true)
    try {
      const res = await axiosMainRequest.put<RoleDefaultsResponse>(apiRoutes.team.roleDefaultPermissions, {
        byRole: draftByRole,
      })
      const byRole = cloneRoleMap(res.data.byRole)
      setSavedByRole(byRole)
      setDraftByRole(cloneRoleMap(byRole))
      setSuccess('Настройки сохранены')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  function resetDraft () {
    if (!savedByRole) return
    setDraftByRole(cloneRoleMap(savedByRole))
    setSuccess(null)
    setError(null)
  }

  if (isLoading) return <div>Загрузка…</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="titleH1">Разрешения</h1>
        <p className={styles.desc}>Задайте дефолтные права для ролей. Эти права подставляются при создании нового пользователя.</p>
      </div>

      <div className={styles.roleTabs}>
        {userRoles.map((role) => (
          <button
            key={role}
            type="button"
            className={styles.roleTab}
            data-active={role === selectedRole ? 'true' : 'false'}
            onClick={() => setSelectedRole(role)}
          >
            {userRoleLabels[role]}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.list}>
          {availablePermissions.map((item) => (
            <label key={item.key} className={styles.row}>
              <input type="checkbox" checked={selectedSet.has(item.key)} onChange={() => togglePermission(item.key)} />
              <span className={styles.label}>{item.label}</span>
              <span className={styles.key}>{item.key}</span>
            </label>
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.saveBtn} onClick={save} disabled={isSaving || !hasUnsavedChanges}>
            {isSaving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button type="button" className={styles.resetBtn} onClick={resetDraft} disabled={isSaving || !hasUnsavedChanges}>
            Сбросить
          </button>
          {success ? <span className={styles.status}>{success}</span> : null}
          {error ? <span className={styles.error}>{error}</span> : null}
        </div>
      </div>
    </div>
  )
}

