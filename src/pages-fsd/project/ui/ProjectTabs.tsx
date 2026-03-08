import styles from './ProjectPage.module.css'

export type ProjectTabKey = 'overview' | 'addressbook' | 'checklists' | 'surveys' | 'assignments' | 'settings'

export function ProjectTabs ({
  value,
  onChange,
  pointsCount,
  checklistsCount,
}: {
  value: ProjectTabKey
  onChange: (next: ProjectTabKey) => void
  pointsCount: number
  checklistsCount: number
}) {
  return (
    <div className={styles.tabsRow} role="tablist" aria-label="Разделы проекта">
      <TabButton active={value === 'overview'} onClick={() => onChange('overview')}>
        Обзор
      </TabButton>
      <TabButton active={value === 'addressbook'} onClick={() => onChange('addressbook')}>
        Адресная программа <span className={styles.badge}>{pointsCount}</span>
      </TabButton>
      <TabButton active={value === 'checklists'} onClick={() => onChange('checklists')}>
        Чек-листы <span className={styles.badge}>{checklistsCount}</span>
      </TabButton>
      <TabButton active={value === 'surveys'} onClick={() => onChange('surveys')}>
        Анкеты
      </TabButton>
      <TabButton active={value === 'assignments'} onClick={() => onChange('assignments')}>
        Назначения
      </TabButton>
      <TabButton active={value === 'settings'} onClick={() => onChange('settings')}>
        Настройки
      </TabButton>
    </div>
  )
}

function TabButton ({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`${styles.tabButton} ${active ? styles.tabButtonActive : ''}`.trim()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

