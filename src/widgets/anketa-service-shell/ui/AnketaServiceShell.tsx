'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import styles from './AnketaServiceShell.module.css'
import { ClientSwitcher } from './ClientSwitcher'
import { ProfileInfo } from './ProfileInfo'

const menuItems = [
  { href: '/clients', label: 'Клиенты', shortLabel: 'Кл' },
  { href: '/team', label: 'Команда', shortLabel: 'К' },
  { href: '/dashboard', label: 'Дашборд', shortLabel: 'Д' },
  { href: '/projects', label: 'Проекты', shortLabel: 'П' },
  { href: '/price-monitoring', label: 'Ценовой мониторинг', shortLabel: 'Ц' },
  { href: '/survey-builder', label: 'Конструктор анкет', shortLabel: 'А' },
  { href: '/reports', label: 'Отчет по анкетам', shortLabel: 'О' },
] as const

export function AnketaServiceShell ({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const sidebarState = useMemo(() => (isSidebarCollapsed ? 'collapsed' : 'expanded'), [isSidebarCollapsed])

  return (
    <div className={styles.shell} data-sidebar={sidebarState}>
      <aside className={styles.sidebar} aria-label="Меню сервиса">
        <div className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true" />
          <div className={styles.profileText}>
            <ProfileInfo nameClassName={styles.profileName} metaClassName={styles.profileMeta} />
            {!isSidebarCollapsed ? <ClientSwitcher /> : null}
          </div>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              <span className={styles.navLinkText}>
                {isSidebarCollapsed ? item.shortLabel : item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <button
            type="button"
            className={styles.collapseButton}
            aria-label={isSidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            onClick={() => setIsSidebarCollapsed((v) => !v)}
          >
            {isSidebarCollapsed ? '→' : '←'}
          </button>
        </div>
      </aside>

      <div className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  )
}

