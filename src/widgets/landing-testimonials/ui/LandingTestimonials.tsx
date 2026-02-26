import { Container } from '@/shared/ui'

import styles from './LandingTestimonials.module.css'

const testimonials = [
  {
    text:
      'Мы получили понятную систему контроля полевых работ: отчёты собираются быстро, а качество интервью стало предсказуемым.',
    name: 'Михаил Г.',
    role: 'Директор',
    company: 'ИП «Горностаев»',
  },
  {
    text:
      'Спасибо за гибкость и скорость внедрения. Интерфейс понятный, а процессы контролируются по шагам — от задач до результатов.',
    name: 'Юрий С.',
    role: 'Генеральный директор',
    company: 'Good People Group',
  },
  {
    text:
      'Команда стала быстрее закрывать задачи: контроль визитов и доступы помогли убрать хаос в полевых проектах.',
    name: 'Ольга С.',
    role: 'Директор по развитию',
    company: 'ITS Group',
  },
] as const

export function LandingTestimonials () {
  return (
    <section className={styles.section}>
      <Container>
        <h2 className={styles.title}>Нас благодарят</h2>
        <div className={styles.grid}>
          {testimonials.map((t) => (
            <article key={t.name} className={styles.card}>
              <div className={styles.text}>{t.text}</div>
              <div className={styles.person}>
                <div className={styles.avatar} aria-hidden="true" />
                <div className={styles.personText}>
                  <div className={styles.personName}>{t.name}</div>
                  <div className={styles.personRole}>
                    {t.role}
                    <span className={styles.sep} aria-hidden="true">
                      ·
                    </span>
                    {t.company}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

