from app.models.user_role import UserRole


PERMISSIONS: list[tuple[str, str]] = [
  ('page.clients.view', 'Видеть страницу Клиенты'),
  ('page.team.view', 'Видеть страницу Команда'),
  ('page.dashboard.view', 'Видеть страницу Дашборд'),
  ('page.projects.view', 'Видеть страницу Проекты'),
  ('page.price-monitoring.view', 'Видеть страницу Ценовой мониторинг'),
  ('page.survey-builder.view', 'Видеть страницу Конструктор анкет'),
  ('page.reports.view', 'Видеть страницу Отчет по анкетам'),
  ('page.permissions.view', 'Видеть страницу Разрешения'),
  ('media.audio.view', 'Видеть аудио'),
  ('media.photo.view', 'Видеть фото'),
  ('media.video.view', 'Видеть видео'),
  ('checks.create', 'Создавать проверки'),
  ('checks.appeal', 'Апеллировать'),
  ('notifications.enabled', 'Получать уведомления'),
  ('checks.edit', 'Редактировать проверки'),
  ('users.edit', 'Редактировать профили пользователей'),
  ('notifications.send', 'Отправлять уведомления'),
  ('notifications.inbox', 'Видеть уведомления'),
  ('data.export', 'Экспорт'),
  ('data.import', 'Импорт'),
  ('tp.fio.view', 'Видеть ФИО ТП'),
  ('survey.pdf.view', 'Видеть PDF анкеты'),
  ('checks.price.view', 'Видеть цену проверки'),
]

PERMISSION_KEYS = {k for k, _ in PERMISSIONS}

BASE_DEFAULT_PERMISSIONS_BY_ROLE: dict[UserRole, list[str]] = {
  UserRole.admin: [k for k, _ in PERMISSIONS],
  UserRole.manager: [k for k, _ in PERMISSIONS if k != 'page.permissions.view'],
  UserRole.controller: [
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
  UserRole.coordinator: [
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
  UserRole.client: [
    'page.dashboard.view',
    'page.reports.view',
    'media.photo.view',
    'survey.pdf.view',
    'notifications.inbox',
  ],
}

PAGE_PERMISSION_KEYS = {k for k in PERMISSION_KEYS if k.startswith('page.')}

