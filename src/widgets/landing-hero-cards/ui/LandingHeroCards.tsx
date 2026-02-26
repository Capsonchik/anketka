import styles from './LandingHeroCards.module.css'

type Card = {
  title: string
  subtitle: string
  kind: 'chart' | 'map' | 'tools' | 'directions'
}

const cards: Card[] = [
  { title: 'Динамика', subtitle: 'графики и отчёты', kind: 'chart' },
  { title: 'Полевые точки', subtitle: 'контроль маршрутов', kind: 'map' },
  { title: '> 100 инструментов', subtitle: 'для работы', kind: 'tools' },
  { title: 'Направления', subtitle: 'срезы по аудиториям', kind: 'directions' },
]

function CardIllustration ({ kind }: { kind: Card['kind'] }) {
  if (kind === 'chart') {
    return (
      <div className={styles.illustration}>
        <div className={styles.chartBar} />
        <div className={styles.chartBar} />
        <div className={styles.chartBar} />
        <div className={styles.chartLine} />
      </div>
    )
  }

  if (kind === 'map') {
    return (
      <div className={styles.illustration}>
        <div className={styles.mapPin} />
        <div className={styles.mapPin} />
        <div className={styles.mapPin} />
        <div className={styles.mapRing} />
      </div>
    )
  }

  if (kind === 'tools') {
    return (
      <div className={styles.illustration}>
        <div className={styles.toolsGrid}>
          <div className={styles.toolsTile} />
          <div className={styles.toolsTile} />
          <div className={styles.toolsTile} />
          <div className={styles.toolsTile} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.illustration}>
      <div className={styles.directionsRow} />
      <div className={styles.directionsRow} />
      <div className={styles.directionsRow} />
    </div>
  )
}

export function LandingHeroCards () {
  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <article key={card.title} className={styles.card}>
          <div className={styles.cardTop}>
            <CardIllustration kind={card.kind} />
          </div>
          <div className={styles.cardBottom}>
            <div className={styles.cardTitle}>{card.title}</div>
            <div className={styles.cardSubtitle}>{card.subtitle}</div>
          </div>
        </article>
      ))}
    </div>
  )
}

