import Image from 'next/image'

import styles from './TeamUsersViewToggle.module.css'

export type TeamUsersViewMode = 'cards' | 'list'

export function TeamUsersViewToggle ({
  value,
  onChange,
}: {
  value: TeamUsersViewMode
  onChange: (value: TeamUsersViewMode) => void
}) {
  return (
    <div className={styles.root} role="group" aria-label="Вид отображения участников">
      <button
        type="button"
        className={`${styles.button} ${value === 'cards' ? styles.active : ''}`}
        aria-pressed={value === 'cards'}
        aria-label="Отображение карточками"
        onClick={() => onChange('cards')}
      >
        <Image className={styles.icon} src="/icons/widget.svg" alt="" width={18} height={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${styles.button} ${value === 'list' ? styles.active : ''}`}
        aria-pressed={value === 'list'}
        aria-label="Отображение списком"
        onClick={() => onChange('list')}
      >
        <Image className={styles.icon} src="/icons/checklist.svg" alt="" width={18} height={18} aria-hidden="true" />
      </button>
    </div>
  )
}

