import { LandingHeader } from '@/widgets/landing-header'
import { Container } from '@/shared/ui'

import styles from './page.module.css'

const tariffs = [
  { name: 'Старт', price: '0 ₽', perks: ['1 проект', 'до 100 ответов', 'экспорт CSV (позже)'] },
  {
    name: 'Команда',
    price: 'от 9 900 ₽',
    perks: ['до 10 проектов', 'роли и доступы', 'контроль качества'],
  },
  {
    name: 'Enterprise',
    price: 'по запросу',
    perks: ['SLA', 'интеграции', 'on-premise (опционально)'],
  },
] as const

export default function TariffsPage () {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <Container>
        <h1 className={styles.title}>Тарифы</h1>
        <p className={styles.subtitle}>
          Временная страница. Тут будут реальные тарифы, сравнение и форма заявки.
        </p>

        <div className={styles.grid}>
          {tariffs.map((t) => (
            <article key={t.name} className={styles.card}>
              <div className={styles.cardName}>{t.name}</div>
              <div className={styles.cardPrice}>{t.price}</div>
              <ul className={styles.list}>
                {t.perks.map((perk) => (
                  <li key={perk} className={styles.listItem}>
                    {perk}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </div>
  )
}

