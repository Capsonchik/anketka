export type ServiceMenuItem = {
  href: string
  label: string
  shortLabel: string
  permissionKey: string
}

export const serviceMenuItems: ServiceMenuItem[] = [
  { href: '/clients', label: 'Клиенты', shortLabel: 'Кл', permissionKey: 'page.clients.view' },
  { href: '/team', label: 'Команда', shortLabel: 'К', permissionKey: 'page.team.view' },
  { href: '/dashboard', label: 'Дашборд', shortLabel: 'Д', permissionKey: 'page.dashboard.view' },
  { href: '/projects', label: 'Проекты', shortLabel: 'П', permissionKey: 'page.projects.view' },
  {
    href: '/price-monitoring',
    label: 'Ценовой мониторинг',
    shortLabel: 'Ц',
    permissionKey: 'page.price-monitoring.view',
  },
  { href: '/survey-builder', label: 'Конструктор анкет', shortLabel: 'А', permissionKey: 'page.survey-builder.view' },
  { href: '/reports', label: 'Отчет по анкетам', shortLabel: 'О', permissionKey: 'page.reports.view' },
  { href: '/permissions', label: 'Разрешения', shortLabel: 'Рз', permissionKey: 'page.permissions.view' },
]

