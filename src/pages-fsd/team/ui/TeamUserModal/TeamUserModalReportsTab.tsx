import { Checkbox, SelectPicker } from 'rsuite'

import { Button } from '@/shared/ui'
import type {
  ReplaceUserCompanyReportsRequest,
  UserCompaniesAccessResponse,
  UserCompanyReportsResponse,
} from '../../model/types'

import styles from './TeamUserModal.module.css'
import { FieldEdit } from './TeamUserModalFields'

type ReportOption = { key: string; label: string }

export function TeamUserModalReportsTab ({
  actualMode,
  reportsError,
  reportsCompanyId,
  companiesAccess,
  reportOptions,
  reportsDraft,
  isReportsSaving,
  reports,
  onReportsCompanyIdChange,
  onReportsDraftChange,
  onSave,
}: {
  actualMode: 'view' | 'edit'
  reportsError: string | null
  reportsCompanyId: string | null
  companiesAccess: UserCompaniesAccessResponse | null
  reportOptions: ReportOption[]
  reportsDraft: ReplaceUserCompanyReportsRequest
  isReportsSaving: boolean
  reports: UserCompanyReportsResponse | null
  onReportsCompanyIdChange: (companyId: string | null) => void
  onReportsDraftChange: (next: ReplaceUserCompanyReportsRequest) => void
  onSave: () => void
}) {
  return (
    <div className={styles.grid}>
      {reportsError ? <div className={styles.error}>{reportsError}</div> : null}
      <FieldEdit label="Клиент">
        <SelectPicker
          value={reportsCompanyId}
          onChange={(v) => onReportsCompanyIdChange((v as string | null) ?? null)}
          data={(companiesAccess?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
          cleanable={false}
          searchable
          block
          disabled={!companiesAccess?.items?.length}
        />
      </FieldEdit>

      <div className={styles.row}>
        <div className={styles.label}>Доступные отчеты</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {reportOptions.map((report) => {
            const checked = (reportsDraft.reportKeys ?? []).includes(report.key)
            return (
              <Checkbox
                key={report.key}
                checked={checked}
                disabled={actualMode !== 'edit'}
                onChange={(_, next) => {
                  const set = new Set(reportsDraft.reportKeys ?? [])
                  if (next) set.add(report.key)
                  else set.delete(report.key)
                  onReportsDraftChange({ ...reportsDraft, reportKeys: [...set] })
                }}
              >
                {report.label}
              </Checkbox>
            )
          })}
          <div className={styles.hint}>Выбрано: {reportsDraft.reportKeys?.length ?? 0}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button
          type="button"
          variant="primary"
          disabled={actualMode !== 'edit' || !reportsCompanyId || isReportsSaving}
          onClick={onSave}
        >
          {isReportsSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      {reports?.reportKeys?.length ? <div className={styles.hint}>Сохранено ключей: {reports.reportKeys.length}</div> : null}
    </div>
  )
}
