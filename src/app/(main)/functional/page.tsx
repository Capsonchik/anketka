import { LandingHeader } from '@/widgets/landing-header'
import { Container } from '@/shared/ui'

import styles from './page.module.css'

const items = [
  'Редактор анкеты с логикой переходов',
  'Роли и доступы (интервьюер/супервайзер/админ)',
  'Качество: контрольные вопросы и проверки',
  'Экспорт в CSV/XLSX (позже)',
] as const

export default function FunctionalPage () {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <Container>
        <h1 className={styles.title}>Функционал</h1>
        <p className={styles.subtitle}>
          Временная страница. Сюда положим описание модулей сервиса и короткие примеры экранов.
        </p>

        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item} className={styles.listItem}>
              <span className={styles.bullet} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  )
}

