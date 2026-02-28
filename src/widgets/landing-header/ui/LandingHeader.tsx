import Link from 'next/link'

import { ButtonLink, Container } from '@/shared/ui'

import styles from './LandingHeader.module.css'

const navItems = [
  { href: '/projects', label: 'Проекты' },
  { href: '/functional', label: 'Функционал' },
  { href: '/company', label: 'О компании' },
  { href: '/tariffs', label: 'Тарифы' },
] as const

export function LandingHeader () {
  return (
    <header className={styles.header}>
      <Container className={styles.container}>
        <Link href="/" className={styles.brand} aria-label="Анкетка — на главную">
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>ANKETKA</span>
            <span className={styles.brandSubtitle}>population survey service</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Основное меню">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} prefetch className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <ButtonLink href="/tariffs" variant="primary">
            Запросить демо
          </ButtonLink>
          <div className={styles.auth}>
            <Link href="/login" prefetch className={styles.authLink}>
              Вход
            </Link>
            <span className={styles.authSeparator} aria-hidden="true">
              /
            </span>
            <Link href="/register" prefetch className={styles.authLink}>
              Регистрация
            </Link>
          </div>
        </div>
      </Container>
    </header>
  )
}

