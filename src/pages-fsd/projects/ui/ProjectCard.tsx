'use client'

import type { ProjectItem } from '../model/types'
import { formatRuDate } from '../lib/formatRuDate'

import styles from './ProjectsPage.module.css'

export function ProjectCard ({ project }: { project: ProjectItem }) {
  const manager = project.manager
  const managerLabel = manager ? `${manager.firstName} ${manager.lastName}`.trim() || manager.email : '—'
  const datesLabel = `${formatRuDate(project.startDate)} — ${formatRuDate(project.endDate)}`

  return (
    <div className={styles.card}>
      <div className={styles.cardTitleRow}>
        <div className={styles.cardTitle}>{project.name}</div>
      </div>

      <div className={styles.cardDescription}>{project.comment || '—'}</div>

      <span className={styles.metaValue}>{managerLabel}</span>
      <span className={styles.metaValue}>{datesLabel}</span>
    </div>
  )
}

