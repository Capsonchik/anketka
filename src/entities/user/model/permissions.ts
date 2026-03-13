import type { UserRole } from './roles'

export const userPermissions: Array<{ key: string; label: string }> = [
  { key: 'page.clients.view', label: 'Видеть страницу Клиенты' },
  { key: 'page.team.view', label: 'Видеть страницу Команда' },
  { key: 'page.dashboard.view', label: 'Видеть страницу Дашборд' },
  { key: 'page.projects.view', label: 'Видеть страницу Проекты' },
  { key: 'page.price-monitoring.view', label: 'Видеть страницу Ценовой мониторинг' },
  { key: 'page.survey-builder.view', label: 'Видеть страницу Конструктор анкет' },
  { key: 'page.reports.view', label: 'Видеть страницу Отчет по анкетам' },
  { key: 'page.permissions.view', label: 'Видеть страницу Разрешения' },
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
  manager: userPermissions.filter((x) => x.key !== 'page.permissions.view').map((x) => x.key),
  controller: [
    'page.dashboard.view',
    'page.projects.view',
    'page.price-monitoring.view',
    'page.reports.view',
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
    'page.team.view',
    'page.dashboard.view',
    'page.projects.view',
    'page.price-monitoring.view',
    'page.survey-builder.view',
    'page.reports.view',
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
  client: ['page.dashboard.view', 'page.reports.view', 'media.photo.view', 'survey.pdf.view', 'notifications.inbox'],
}
