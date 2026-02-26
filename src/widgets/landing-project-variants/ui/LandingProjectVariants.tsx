import { Button, Container } from '@/shared/ui'

import styles from './LandingProjectVariants.module.css'

const variants = [
  {
    title: 'Визуальный мерчендайзинг',
    description: 'Фотоотчёты и проверки по точкам продаж.',
  },
  {
    title: 'Технический мерчендайзинг',
    description: 'Чек-листы, контроль наличия и выкладок.',
  },
  {
    title: 'Дистанционные проверки',
    description: 'Сбор данных и контроль удалённо.',
  },
  {
    title: 'Консультанты и промоутеры',
    description: 'Учёт визитов и выполненных задач.',
  },
  {
    title: 'Тайные покупатели и аудиторы',
    description: 'Контроль качества сервиса и соблюдения стандартов.',
  },
  {
    title: 'Другие варианты проектов',
    description: 'Под задачи бизнеса и полевых команд.',
  },
] as const

export function LandingProjectVariants () {
  return (
    <section className={styles.section}>
      <Container className={styles.container}>
        <div className={styles.left}>
          <h2 className={styles.title}>Варианты проектов</h2>
        </div>

        <div className={styles.grid}>
          {variants.map((v) => (
            <article key={v.title} className={styles.card}>
              <div className={styles.icon} aria-hidden="true" />
              <div className={styles.cardTitle}>{v.title}</div>
              <div className={styles.cardDescription}>{v.description}</div>
              <Button type="button" variant="ghost" className={styles.more}>
                Подробнее
              </Button>
            </article>
          ))}

          <article className={styles.helpCard}>
            <div className={styles.helpIcon} aria-hidden="true" />
            <div className={styles.helpTitle}>Не знаю что нам подойдёт</div>
            <Button type="button" variant="primary" className={styles.helpCta}>
              Требуется помощь
            </Button>
          </article>
        </div>
      </Container>
    </section>
  )
}

