import styles from './TeamTabs.module.css'

export type TeamTabKey = 'users' | 'auditors'

export function TeamTabs ({
  value,
  onChange,
}: {
  value: TeamTabKey
  onChange: (value: TeamTabKey) => void
}) {
  return (
    <div className={styles.tabsRow}>
      <button
        type="button"
        className={`${styles.tabButton} ${value === 'users' ? styles.tabButtonActive : ''}`.trim()}
        onClick={() => onChange('users')}
      >
        Участники
      </button>
      <button
        type="button"
        className={`${styles.tabButton} ${value === 'auditors' ? styles.tabButtonActive : ''}`.trim()}
        onClick={() => onChange('auditors')}
      >
        Аудиторы
      </button>
    </div>
  )
}

