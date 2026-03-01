import Link from 'next/link'

import styles from './AnketaServiceShell.module.css'
import { ProfileInfo } from './ProfileInfo'

const menuItems = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/price-monitoring', label: 'Ценовой мониторинг' },
  { href: '/reports', label: 'Отчеты' },
  { href: '/survey-builder', label: 'Конструктор анкет' },
] as const

export function AnketaServiceShell ({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Меню сервиса">
        <div className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true" />
          <div className={styles.profileText}>
            <ProfileInfo nameClassName={styles.profileName} metaClassName={styles.profileMeta} />
          </div>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  )
}

