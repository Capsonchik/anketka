import { ButtonLink, Container } from '@/shared/ui'
import { LandingHeroCards } from '@/widgets/landing-hero-cards'

import styles from './LandingHero.module.css'

const metrics = [
  { value: '>90', label: 'постоянных клиентов' },
  { value: '>15 000', label: 'активных пользователей' },
] as const

export function LandingHero () {
  return (
    <section className={styles.section}>
      <Container className={styles.container}>
        <div className={styles.left}>
          <div className={styles.kicker}>Анкетирование населения</div>
          <h1 className={styles.title}>Спокойный сервис для опросов и отчётности</h1>
          <p className={styles.subtitle}>
            Онлайн-платформа с инструментами для сбора данных, проверки качества и анализа результатов.
          </p>

          <div className={styles.metrics}>
            {metrics.map((m) => (
              <div key={m.value} className={styles.metric}>
                <div className={styles.metricValue}>{m.value}</div>
                <div className={styles.metricLabel}>{m.label}</div>
              </div>
            ))}
          </div>

          <div className={styles.ctas}>
            <ButtonLink href="/tariffs" variant="primary">
              Получить консультацию
            </ButtonLink>
            <ButtonLink href="/projects" variant="secondary">
              Посмотреть примеры
            </ButtonLink>
          </div>

          <div className={styles.stores} aria-label="Доступно в магазинах приложений">
            <div className={styles.storeChip}>Google Play</div>
            <div className={styles.storeChip}>App Store</div>
          </div>
        </div>

        <div className={styles.right} aria-hidden="true">
          <LandingHeroCards />
        </div>
      </Container>
    </section>
  )
}

