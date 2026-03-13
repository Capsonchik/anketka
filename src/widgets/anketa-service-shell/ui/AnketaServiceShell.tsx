'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { hasUserPermission } from '@/entities/user'
import { useBootstrapData } from '@/shared/lib/bootstrap-data'

import { serviceMenuItems } from '../model/service-menu'
import styles from './AnketaServiceShell.module.css'
import { ClientSwitcher } from './ClientSwitcher'
import { ProfileInfo } from './ProfileInfo'

export function AnketaServiceShell ({ children }: { children: React.ReactNode }) {
  const { me } = useBootstrapData()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const sidebarState = useMemo(() => (isSidebarCollapsed ? 'collapsed' : 'expanded'), [isSidebarCollapsed])
  const visibleMenuItems = useMemo(
    () => serviceMenuItems.filter((item) => hasUserPermission(me, item.permissionKey)),
    [me],
  )

  return (
    <div className={styles.shell} data-sidebar={sidebarState}>
      <aside className={styles.sidebar} aria-label="Меню сервиса">
        <div className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true" />
          <div className={styles.profileText}>
            <ProfileInfo nameClassName={styles.profileName} metaClassName={styles.profileMeta} />
          </div>
        </div>

        <ClientSwitcher collapsed={isSidebarCollapsed} />

        <nav className={styles.nav}>
          {visibleMenuItems.map((item) => (
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

