import type { ChecklistItemPublic, ProjectItem, ShopPointItem } from '../../model/types'
import { computeProjectDashboard } from '../../lib/computeProjectDashboard'
import styles from '../ProjectPage.module.css'

export function ProjectOverviewTab ({
  project,
  points,
  checklists,
  isPointsLoading,
  isChecklistsLoading,
}: {
  project: ProjectItem | null
  points: ShopPointItem[]
  checklists: ChecklistItemPublic[]
  isPointsLoading: boolean
  isChecklistsLoading: boolean
}) {
  const stats = computeProjectDashboard({ points, checklists, topChainsLimit: 10 })
  const isLoading = isPointsLoading || isChecklistsLoading

  return (
    <div className={styles.tabPanel}>
      <div className={styles.dashboardGrid}>
        <KpiCard title="Покрытие" value={`${stats.coveragePct}%`} hint={`${stats.coveredPointsCount} из ${stats.pointsCount} точек`} />
        <KpiCard title="Точки" value={String(stats.pointsCount)} hint="в адресной программе" />
        <KpiCard title="Сети" value={String(stats.chainsCount)} hint="в адресной программе" />
        <KpiCard title="Чек-листы" value={String(stats.checklistsCount)} hint={`${stats.checklistItemsCount} позиций`} />
      </div>

      {isLoading ? <div className={styles.hint}>Загрузка статистики…</div> : null}

      <div className={styles.dashboardTwoCols}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>Покрытие точек чек-листами</div>
          </div>
          <div className={styles.coverageRow}>
            <Donut pct={stats.coveragePct} />
            <div className={styles.coverageText}>
              <div className={styles.coverageBig}>{stats.coveragePct}%</div>
              <div className={styles.hint}>
                Покрыто: <b>{stats.coveredPointsCount}</b> · Без чек-листа: <b>{stats.pointsCount - stats.coveredPointsCount}</b>
              </div>
              {!project ? <div className={styles.hint} style={{ marginTop: 6 }}>Проект не загружен</div> : null}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>Точки по сетям</div>
          </div>
          <BarList rows={stats.topChains} />
        </section>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Проблемные места</div>
        </div>

        {stats.uncoveredChains.length === 0 ? (
          <div className={styles.hint}>Все сети, которые есть в адресной программе, имеют хотя бы один чек-лист в проекте.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Сеть</th>
                  <th className={styles.th}>Точек без чек-листа</th>
                </tr>
              </thead>
              <tbody>
                {stats.uncoveredChains.map((x) => (
                  <tr key={x.chainId}>
                    <td className={styles.td}>{x.chainName}</td>
                    <td className={styles.td}>{x.pointsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function KpiCard ({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTitle}>{title}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiHint}>{hint}</div>
    </div>
  )
}

function Donut ({ pct }: { pct: number }) {
  const safe = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0
  const style = { '--pct': safe } as React.CSSProperties
  return <div className={styles.donut} style={style} aria-label={`Покрытие ${safe}%`} />
}

function BarList ({
  rows,
}: {
  rows: Array<{ chainId: string; chainName: string; pointsCount: number; isCovered: boolean }>
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.pointsCount), 1)
  if (rows.length === 0) return <div className={styles.hint}>Нет данных</div>

  return (
    <div className={styles.barList}>
      {rows.map((r) => (
        <div key={r.chainId} className={styles.barRow}>
          <div className={styles.barLabel}>
            {r.chainName} {!r.isCovered ? <span className={styles.badgeWarn}>нет чек-листа</span> : null}
          </div>
          <div className={styles.barTrack} aria-label={`${r.chainName}: ${r.pointsCount}`}>
            <div className={styles.barFill} style={{ width: `${Math.round((r.pointsCount / max) * 100)}%` }} />
          </div>
          <div className={styles.barValue}>{r.pointsCount}</div>
        </div>
      ))}
    </div>
  )
}

