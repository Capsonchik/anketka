'use client'

import { useState } from 'react'
import { Input, SelectPicker } from 'rsuite'

import type { UserRole } from '@/entities/user'
import { userRoleOptions } from '@/entities/user'
import { Button, PageLoader } from '@/shared/ui'

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
  isEmpty,
  search,
  roleFilter,
  activeFilter,
  emailFilter,
  phoneFilter,
  companyFilter,
  idFilter,
  onSearchChange,
  onRoleFilterChange,
  onActiveFilterChange,
  onEmailFilterChange,
  onPhoneFilterChange,
  onCompanyFilterChange,
  onIdFilterChange,
  isAdmin,
  canManageAccess,
  canEditUser,
  onOpenDetails,
  onEdit,
  onAccess,
  onLocations,
  onDelete,
  onAdd,
  canAdd,
}: {
  users: TeamUser[]
  isLoading: boolean
  error: string | null
  isNoResults: boolean
  isEmpty: boolean
  search: string
  roleFilter: UserRole | 'all'
  activeFilter: 'all' | 'active' | 'inactive'
  emailFilter: string
  phoneFilter: string
  companyFilter: string
  idFilter: string
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: UserRole | 'all') => void
  onActiveFilterChange: (value: 'all' | 'active' | 'inactive') => void
  onEmailFilterChange: (value: string) => void
  onPhoneFilterChange: (value: string) => void
  onCompanyFilterChange: (value: string) => void
  onIdFilterChange: (value: string) => void
  isAdmin: boolean
  canManageAccess: boolean
  canEditUser: (user: TeamUser) => boolean
  onOpenDetails: (userId: string) => void
  onEdit: (userId: string) => void
  onAccess: (userId: string) => void
  onLocations: (userId: string) => void
  onDelete: (userId: string) => void
  onAdd: () => void
  canAdd: boolean
}) {
  const [view, setView] = useState<TeamUsersViewMode>('cards')
  const shouldCenterState = isLoading || ((!error && (isNoResults || isEmpty)))

  return (
    <div className={styles.root}>
      <div className={styles.filters}>
        <Input
          size="sm"
          className={styles.input}
          value={search}
          onChange={(value) => onSearchChange(String(value ?? ''))}
          placeholder="Поиск по имени, фамилии или почте…"
          aria-label="Поиск"
        />
        <Input
          size="sm"
          className={styles.input}
          value={emailFilter}
          onChange={(value) => onEmailFilterChange(String(value ?? ''))}
          placeholder="Email…"
          aria-label="Фильтр по email"
        />
        <Input
          size="sm"
          className={styles.input}
          value={phoneFilter}
          onChange={(value) => onPhoneFilterChange(String(value ?? ''))}
          placeholder="Телефон…"
          aria-label="Фильтр по телефону"
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
        <SelectPicker
          size="sm"
          className={styles.select}
          value={activeFilter}
          onChange={(value) => onActiveFilterChange((value as 'all' | 'active' | 'inactive') ?? 'all')}
          aria-label="Фильтр по активности"
          cleanable={false}
          searchable={false}
          block
          data={[
            { label: 'Все', value: 'all' },
            { label: 'Активные', value: 'active' },
            { label: 'Неактивные', value: 'inactive' },
          ]}
        />
        <Input
          size="sm"
          className={styles.input}
          value={companyFilter}
          onChange={(value) => onCompanyFilterChange(String(value ?? ''))}
          placeholder="Компания…"
          aria-label="Фильтр по компании"
        />
        <Input
          size="sm"
          className={styles.input}
          value={idFilter}
          onChange={(value) => onIdFilterChange(String(value ?? ''))}
          placeholder="ID (например 123456)…"
          aria-label="Фильтр по ID"
        />
        <div className={styles.viewToggle}>
          <TeamUsersViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <div className={[styles.resultsArea, shouldCenterState ? styles.resultsAreaCentered : ''].filter(Boolean).join(' ')}>
        {isLoading ? <PageLoader centered size="lg" /> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {(isNoResults || isEmpty) && !isLoading && !error ? (
          <div className={styles.emptyActions}>
            <div className={styles.hint}>Ничего не найдено</div>
            <Button type="button" variant="primary" size="sm" onClick={onAdd} disabled={!canAdd}>
              Добавить
            </Button>
          </div>
        ) : null}

        {!isLoading && !error && !isNoResults && !isEmpty && view === 'cards' ? (
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
                canDelete={canManageAccess}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && !error && !isNoResults && !isEmpty && view !== 'cards' ? (
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
            canDelete={canManageAccess}
          />
        ) : null}
      </div>
    </div>
  )
}

