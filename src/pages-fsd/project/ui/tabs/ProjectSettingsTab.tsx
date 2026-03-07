import type { ProjectItem } from '../../model/types'
import styles from '../ProjectPage.module.css'

export function ProjectSettingsTab ({ project }: { project: ProjectItem | null }) {
  const manager = project?.manager
  const managerLabel = manager ? `${manager.firstName} ${manager.lastName}`.trim() || manager.email : '—'

  return (
    <div className={styles.tabPanel}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Настройки проекта</div>
        </div>

        {!project ? (
          <div className={styles.hint}>Проект не загружен</div>
        ) : (
          <div className={styles.settingsGrid}>
            <SettingRow label="Название" value={project.name} />
            <SettingRow label="Комментарий" value={project.comment || '—'} />
            <SettingRow label="Даты" value={`${String(project.startDate).slice(0, 10)} — ${String(project.endDate).slice(0, 10)}`} />
            <SettingRow label="Ответственный" value={managerLabel} />
          </div>
        )}

        <div className={styles.hint} style={{ marginTop: 10 }}>
          Редактирование настроек (переназначение менеджера, сроки, привязка анкеты) добавим после появления эндпоинта обновления проекта.
        </div>
      </section>
    </div>
  )
}

function SettingRow ({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.settingRow}>
      <div className={styles.settingLabel}>{label}</div>
      <div className={styles.settingValue}>{value}</div>
    </div>
  )
}

