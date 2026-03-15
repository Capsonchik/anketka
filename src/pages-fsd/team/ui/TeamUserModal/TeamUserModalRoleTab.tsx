import { Checkbox, SelectPicker } from 'rsuite'

import { userDefaultPermissionsByRole, userPermissions, userRoleLabel, userRoleOptions, type UserRole } from '@/entities/user'
import { Button } from '@/shared/ui'

import styles from './TeamUserModal.module.css'
import { Field, FieldEdit, PermissionTags } from './TeamUserModalFields'

type RoleGroup = { id: string; name: string }

export function TeamUserModalRoleTab ({
  actualMode,
  userRole,
  userPermissionsValue,
  formRole,
  formPermissions,
  formGroupIds,
  allGroups,
  groupsError,
  onRoleChange,
  onPermissionsChange,
  onGroupIdsChange,
}: {
  actualMode: 'view' | 'edit'
  userRole: UserRole
  userPermissionsValue: string[]
  formRole: UserRole
  formPermissions: string[]
  formGroupIds: string[]
  allGroups: RoleGroup[]
  groupsError: string | null
  onRoleChange: (role: UserRole) => void
  onPermissionsChange: (next: string[]) => void
  onGroupIdsChange: (next: string[]) => void
}) {
  const groupNameById = new Map(allGroups.map((group) => [group.id, group.name]))
  const groupNames = formGroupIds.map((groupId) => groupNameById.get(groupId) ?? groupId)

  if (actualMode === 'view') {
    return (
      <div className={styles.grid}>
        <Field label="Роль" value={userRoleLabel(userRole)} />
        <div className={styles.row}>
          <div className={styles.label}>Права</div>
          <PermissionTags permissions={userPermissionsValue} />
        </div>
        <div className={styles.row}>
          <div className={styles.label}>Пользовательские группы</div>
          {groupsError ? <div className={styles.error}>{groupsError}</div> : null}
          {!groupNames.length && !groupsError ? <div className={styles.value}>—</div> : null}
          {groupNames.length ? (
            <div className={styles.tags}>
              {formGroupIds.map((groupId) => (
                <span key={groupId} className={styles.tag}>
                  {groupNameById.get(groupId) ?? groupId}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      <FieldEdit label="Роль *">
        <SelectPicker
          value={formRole}
          onChange={(v) => {
            const nextRole = ((v as UserRole) ?? 'manager')
            onRoleChange(nextRole)
            onPermissionsChange((userDefaultPermissionsByRole[nextRole] ?? []).slice())
          }}
          cleanable={false}
          searchable={false}
          block
          data={userRoleOptions}
        />
      </FieldEdit>
      <div className={styles.row}>
        <div className={styles.label}>Группы безопасности</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onPermissionsChange((userDefaultPermissionsByRole[formRole] ?? []).slice())}
          >
            Сбросить к роли
          </Button>
          <div style={{ display: 'grid', gap: 6 }}>
            {userPermissions.map((permission) => {
              const checked = formPermissions.includes(permission.key)
              return (
                <Checkbox
                  key={permission.key}
                  checked={checked}
                  onChange={(_, next) => {
                    const set = new Set(formPermissions)
                    if (next) set.add(permission.key)
                    else set.delete(permission.key)
                    onPermissionsChange([...set])
                  }}
                >
                  {permission.label}
                </Checkbox>
              )
            })}
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.label}>Пользовательские группы</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {groupsError ? <div className={styles.error}>{groupsError}</div> : null}
          {!allGroups.length && !groupsError ? <div className={styles.value}>—</div> : null}
          {allGroups.map((group) => {
            const checked = formGroupIds.includes(group.id)
            return (
              <Checkbox
                key={group.id}
                checked={checked}
                onChange={(_, next) => {
                  const set = new Set(formGroupIds)
                  if (next) set.add(group.id)
                  else set.delete(group.id)
                  onGroupIdsChange([...set])
                }}
              >
                {group.name}
              </Checkbox>
            )
          })}
        </div>
      </div>
    </div>
  )
}
