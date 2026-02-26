import { ButtonLink, Container } from '@/shared/ui'

import styles from './LandingTariffs.module.css'

const tariffs = [
  {
    name: 'Гибкие тарифы для разных проектов',
    description:
      'Удобная система тарификации с индивидуальным подходом под задачи и объёмы.',
    isIntro: true,
  },
  {
    name: 'По анкетам',
    description: 'Тарификация в рамках заполненных анкет.',
    price: 'от 3,5 ₽ / анкета',
    cta: 'Запросить расчёт\nпод ваш проект',
  },
  {
    name: 'По пользователям',
    description: 'Тарификация в рамках оплаты лицензии на одного пользователя.',
    price: 'от 350 ₽ / пользователь',
    cta: 'Запросить расчёт\nпод ваш проект',
  },
] as const

export function LandingTariffs () {
  return (
    <section className={styles.section}>
      <Container className={styles.container}>
        <h2 className={styles.title}>Тарифы</h2>

        <div className={styles.grid}>
          {tariffs.map((t) =>
            'isIntro' in t ? (
              <article key={t.name} className={styles.introCard}>
                <div className={styles.introTitle}>{t.name}</div>
                <div className={styles.introText}>{t.description}</div>
              </article>
            ) : (
              <article key={t.name} className={styles.card}>
                <div className={styles.cardName}>{t.name}</div>
                <div className={styles.cardDesc}>{t.description}</div>
                <div className={styles.cardPrice}>{t.price}</div>
                <div className={styles.cardNote}>
                  Финальная стоимость рассчитывается индивидуально по каждому проекту и зависит от
                  объёма.
                </div>
                <ButtonLink href="/tariffs" variant="primary" className={styles.cardCta}>
                  {t.cta}
                </ButtonLink>
              </article>
            ),
          )}
        </div>
      </Container>
    </section>
  )
}

