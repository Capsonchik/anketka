import { LandingHeader } from '@/widgets/landing-header'
import { Container } from '@/shared/ui'

import styles from './page.module.css'

export default function CompanyPage () {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <Container>
        <h1 className={styles.title}>О компании</h1>
        <p className={styles.subtitle}>
          Временная страница. Здесь будет история продукта, команда, контакты и юридическая
          информация.
        </p>

        <div className={styles.cards}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Миссия</div>
            <div className={styles.cardText}>
              Делать сбор данных предсказуемым и спокойным: меньше ручной работы, больше контроля
              качества.
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Контакты</div>
            <div className={styles.cardText}>demo@anketka.local · +7 (000) 000-00-00</div>
          </section>
        </div>
      </Container>
    </div>
  )
}

