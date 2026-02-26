import { Container } from '@/shared/ui'

import styles from './LandingManage.module.css'

type Card = {
  title: string
  items: readonly string[]
}

const cards: readonly Card[] = [
  {
    title: 'Конструктор анкеты',
    items: [
      'Неограниченное количество вопросов',
      'Настройка матриц и шкал',
      'Настраиваемая логика переходов',
      'Управление последовательностью отображения',
      'Настройка обязательных полей',
      'Зависимости по ролям и точкам',
    ],
  },
  {
    title: 'Контроль визитов',
    items: [
      'Защита от фрода: подмены фото, координат, времени',
      'Контроль полноты заполнения анкеты',
      'Отображение начала и окончания рабочего дня',
      'Чекины/чекауты и геолокация',
      'Соблюдение плана визитов',
      'Автосоздание периодов и планов',
    ],
  },
  {
    title: 'Доступ пользователей',
    items: [
      'Роли и права доступа',
      'Управление доступностью полей',
      'Разграничение зон ответственности',
      'Контроль доступа к проекту',
      'Работа офлайн (позже)',
      'Самостоятельная регистрация',
    ],
  },
  {
    title: 'Работа с задачами',
    items: [
      'Постановка задач и контроль сроков',
      'Обязательность выполнения во время визита',
      'Новости/объявления по проекту',
      'Автоматизация регулярных задач',
      'Варианты постановки задач',
      'Кастомные уведомления по запросу',
    ],
  },
] as const

export function LandingManage () {
  return (
    <section className={styles.section}>
      <Container className={styles.container}>
        <div className={styles.left}>
          <h2 className={styles.title}>
            Управляйте проектами
            <br />
            и оптимизируйте
            <br />
            процессы
          </h2>
        </div>

        <div className={styles.grid}>
          {cards.map((card) => (
            <article key={card.title} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>{card.title}</div>
                <div className={styles.cardBadge} aria-hidden="true" />
              </div>
              <ul className={styles.list}>
                {card.items.map((item) => (
                  <li key={item} className={styles.listItem}>
                    <span className={styles.dot} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

