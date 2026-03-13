import type { UserRole } from './roles'

export const userPermissions: Array<{ key: string; label: string }> = [
  { key: 'media.audio.view', label: 'Видеть аудио' },
  { key: 'media.photo.view', label: 'Видеть фото' },
  { key: 'media.video.view', label: 'Видеть видео' },
  { key: 'checks.create', label: 'Создавать проверки' },
  { key: 'checks.appeal', label: 'Апеллировать' },
  { key: 'notifications.enabled', label: 'Получать уведомления' },
  { key: 'checks.edit', label: 'Редактировать проверки' },
  { key: 'users.edit', label: 'Редактировать профили пользователей' },
  { key: 'notifications.send', label: 'Отправлять уведомления' },
  { key: 'notifications.inbox', label: 'Видеть уведомления' },
  { key: 'data.export', label: 'Экспорт' },
  { key: 'data.import', label: 'Импорт' },
  { key: 'tp.fio.view', label: 'Видеть ФИО ТП' },
  { key: 'survey.pdf.view', label: 'Видеть PDF анкеты' },
  { key: 'checks.price.view', label: 'Видеть цену проверки' },
]

const permissionLabelsMap = new Map(userPermissions.map((item) => [item.key, item.label]))

export function userPermissionLabel (key: string) {
  return permissionLabelsMap.get(key) ?? key
}

export const userDefaultPermissionsByRole: Record<UserRole, string[]> = {
  admin: userPermissions.map((x) => x.key),
  manager: userPermissions.map((x) => x.key),
  controller: [
    'media.audio.view',
    'media.photo.view',
    'media.video.view',
    'checks.appeal',
    'notifications.enabled',
    'notifications.inbox',
    'checks.edit',
    'data.export',
    'survey.pdf.view',
    'checks.price.view',
  ],
  coordinator: [
    'media.audio.view',
    'media.photo.view',
    'media.video.view',
    'checks.appeal',
    'notifications.enabled',
    'notifications.inbox',
    'checks.edit',
    'data.export',
    'survey.pdf.view',
    'checks.price.view',
  ],
  client: ['media.photo.view', 'survey.pdf.view', 'notifications.inbox'],
}
