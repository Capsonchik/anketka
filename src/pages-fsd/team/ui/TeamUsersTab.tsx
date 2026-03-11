'use client'

import { useState } from 'react'
import { Input, SelectPicker } from 'rsuite'

import type { UserRole } from '@/entities/user'
import { userRoleOptions } from '@/entities/user'

import type { TeamUser } from '../model/types'
import { TeamUserCard } from './TeamUserCard'
import { TeamUsersTable } from './TeamUsersTable'
import { TeamUsersViewToggle, type TeamUsersViewMode } from './TeamUsersViewToggle'
import styles from './TeamUsersTab.module.css'

export function TeamUsersTab ({
  users,
  isLoading,
  error,
  isNoResults,
  search,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  isAdmin,
  canManageAccess,
  canEditUser,
  onOpenDetails,
  onEdit,
  onAccess,
  onLocations,
  onDelete,
}: {
  users: TeamUser[]
  isLoading: boolean
  error: string | null
  isNoResults: boolean
  search: string
  roleFilter: UserRole | 'all'
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: UserRole | 'all') => void
  isAdmin: boolean
  canManageAccess: boolean
  canEditUser: (user: TeamUser) => boolean
  onOpenDetails: (userId: string) => void
  onEdit: (userId: string) => void
  onAccess: (userId: string) => void
  onLocations: (userId: string) => void
  onDelete: (userId: string) => void
}) {
  const [view, setView] = useState<TeamUsersViewMode>('cards')

  return (
    <>
      <div className={styles.filters}>
        <Input
          size="sm"
          className={styles.input}
          value={search}
          onChange={(value) => onSearchChange(String(value ?? ''))}
          placeholder="Поиск по имени, фамилии или почте…"
          aria-label="Поиск"
        />
        <SelectPicker
          size="sm"
          className={styles.select}
          value={roleFilter}
          onChange={(value) => onRoleFilterChange((value as UserRole | 'all') ?? 'all')}
          aria-label="Фильтр по роли"
          cleanable={false}
          searchable={false}
          block
          data={[
            { label: 'Все роли', value: 'all' },
            ...userRoleOptions,
          ]}
        />
        <div className={styles.viewToggle}>
          <TeamUsersViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {isLoading ? <div className={styles.hint}>Загрузка…</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {isNoResults ? <div className={styles.hint}>Ничего не найдено</div> : null}

      {view === 'cards' ? (
        <div className={styles.grid}>
          {users.map((u) => (
            <TeamUserCard
              key={u.id}
              user={u}
              onOpen={() => onOpenDetails(u.id)}
              onEdit={() => onEdit(u.id)}
              onAccess={() => onAccess(u.id)}
              onLocations={() => onLocations(u.id)}
              onDelete={() => onDelete(u.id)}
              canEdit={canEditUser(u)}
              canAccess={canManageAccess}
              canLocations={canManageAccess}
              canDelete={isAdmin}
            />
          ))}
        </div>
      ) : (
        <TeamUsersTable
          users={users}
          onOpen={(userId) => onOpenDetails(userId)}
          onEdit={(userId) => onEdit(userId)}
          onAccess={(userId) => onAccess(userId)}
          onLocations={(userId) => onLocations(userId)}
          onDelete={(userId) => onDelete(userId)}
          canEdit={canEditUser}
          canAccess={canManageAccess}
          canLocations={canManageAccess}
          canDelete={isAdmin}
        />
      )}
    </>
  )
}

