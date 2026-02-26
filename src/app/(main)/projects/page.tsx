import { LandingHeader } from '@/widgets/landing-header'
import { Container } from '@/shared/ui'

import styles from './page.module.css'

export default function ProjectsPage () {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <Container>
        <h1 className={styles.title}>Проекты</h1>
        <p className={styles.subtitle}>
          Временная страница. Тут будет витрина кейсов/шаблонов опросов и примеры отчётов.
        </p>

        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardTitle}>Городской опрос</div>
            <div className={styles.cardText}>Квоты, контроль маршрутов, отчёты.</div>
          </article>
          <article className={styles.card}>
            <div className={styles.cardTitle}>Retail аудит</div>
            <div className={styles.cardText}>Фото, геометки, контроль качества.</div>
          </article>
          <article className={styles.card}>
            <div className={styles.cardTitle}>NPS/CSAT</div>
            <div className={styles.cardText}>Онлайн анкеты, сегменты, экспорт.</div>
          </article>
        </div>
      </Container>
    </div>
  )
}

