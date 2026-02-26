import Link from 'next/link'

import { Container } from '@/shared/ui'

import styles from './LandingFooter.module.css'

const links = [
  { href: '/projects', label: 'Проекты' },
  { href: '/functional', label: 'Функционал' },
  { href: '/company', label: 'О компании' },
  { href: '/tariffs', label: 'Тарифы' },
] as const

export function LandingFooter () {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.brandMark} aria-hidden="true" />
            <div className={styles.brandText}>
              <div className={styles.brandTitle}>ANKETKA</div>
              <div className={styles.brandSubtitle}>field surveys & reporting</div>
            </div>
          </div>

          <nav className={styles.nav} aria-label="Ссылки футера">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={styles.navLink}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={styles.contacts}>
            <div className={styles.contactTitle}>Контакты</div>
            <a className={styles.contactLink} href="mailto:demo@anketka.local">
              demo@anketka.local
            </a>
            <div className={styles.contactMeta}>Поддержка: 9:00–18:00 МСК</div>
          </div>
        </div>

        <div className={styles.bottom}>
          <div className={styles.copy}>© {year} Anketka</div>
          <div className={styles.legal}>
            <Link className={styles.legalLink} href="/company">
              Политика конфиденциальности
            </Link>
            <span className={styles.dot} aria-hidden="true">
              ·
            </span>
            <Link className={styles.legalLink} href="/company">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  )
}

