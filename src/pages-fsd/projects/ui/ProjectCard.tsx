'use client'

import Link from 'next/link'

import type { ProjectItem } from '../model/types'
import { formatRuDate } from '../lib/formatRuDate'

import styles from './ProjectsPage.module.css'

export function ProjectCard ({
  project,
  isAdmin,
  isDeleting,
  onDelete,
}: {
  project: ProjectItem
  isAdmin: boolean
  isDeleting: boolean
  onDelete: () => void
}) {
  const manager = project.manager
  const managerLabel = manager ? `${manager.firstName} ${manager.lastName}`.trim() || manager.email : '—'
  const datesLabel = `${formatRuDate(project.startDate)} — ${formatRuDate(project.endDate)}`

  return (
    <div className={styles.cardWrapper}>
      <Link href={`/projects/${project.id}`} className={styles.cardLink}>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitle}>{project.name}</div>
          </div>

          <div className={styles.cardDescription}>{project.comment || '—'}</div>

          <span className={styles.metaValue}>{managerLabel}</span>
          <span className={styles.metaValue}>{datesLabel}</span>
        </div>
      </Link>

      {isAdmin ? (
        <button
          type="button"
          className={styles.deleteButton}
          aria-label="Удалить проект"
          disabled={isDeleting}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }}
        >
          <img src="/icons/trash.svg" width={16} height={16} alt="" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
