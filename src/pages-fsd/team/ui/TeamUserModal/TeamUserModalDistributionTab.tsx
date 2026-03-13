import { CheckPicker, Checkbox, Input, SelectPicker } from 'rsuite'

import { Button } from '@/shared/ui'
import type { ShopPointItem } from '@/pages-fsd/project/model/types'
import type { ReplaceUserCompanyDistributionRequest, UserCompaniesAccessResponse } from '../../model/types'

import styles from './TeamUserModal.module.css'
import { FieldEdit } from './TeamUserModalFields'

export function TeamUserModalDistributionTab ({
  actualMode,
  companiesAccess,
  companiesError,
  distError,
  activeDistributionCompanyId,
  filterOptions,
  filterTitles,
  distDraft,
  points,
  pointsLoading,
  pointsQ,
  pointsRegion,
  isDistSaving,
  onActiveDistributionCompanyIdChange,
  onToggleCompanyAccess,
  onDistDraftChange,
  onPointsQChange,
  onPointsRegionChange,
  onSave,
}: {
  actualMode: 'view' | 'edit'
  companiesAccess: UserCompaniesAccessResponse | null
  companiesError: string | null
  distError: string | null
  activeDistributionCompanyId: string | null
  filterOptions: Record<string, string[]>
  filterTitles: Record<string, string>
  distDraft: ReplaceUserCompanyDistributionRequest
  points: ShopPointItem[]
  pointsLoading: boolean
  pointsQ: string
  pointsRegion: string | null
  isDistSaving: boolean
  onActiveDistributionCompanyIdChange: (companyId: string | null) => void
  onToggleCompanyAccess: (enabled: boolean) => void
  onDistDraftChange: (next: ReplaceUserCompanyDistributionRequest) => void
  onPointsQChange: (value: string) => void
  onPointsRegionChange: (value: string | null) => void
  onSave: () => void
}) {
  return (
    <div className={styles.grid}>
      {companiesError ? <div className={styles.error}>{companiesError}</div> : null}
      {distError ? <div className={styles.error}>{distError}</div> : null}

      <FieldEdit label="Клиент">
        <SelectPicker
          value={activeDistributionCompanyId}
          onChange={(v) => onActiveDistributionCompanyIdChange((v as string | null) ?? null)}
          data={(companiesAccess?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
          cleanable={false}
          searchable
          block
          disabled={!companiesAccess?.items?.length}
        />
      </FieldEdit>

      <div className={styles.row}>
        <div className={styles.label}>Доступ к клиенту</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <Checkbox
            checked={Boolean((companiesAccess?.items ?? []).find((c) => c.id === activeDistributionCompanyId)?.hasAccess)}
            disabled={!activeDistributionCompanyId || !companiesAccess}
            onChange={(_, next) => onToggleCompanyAccess(Boolean(next))}
          >
            Разрешить доступ
          </Checkbox>
          <div className={styles.hint}>
            Если доступ выключен - пользователь не сможет переключиться на этого клиента в селекторе.
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.label}>Характеристики точки</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {Object.keys(filterOptions).length ? (
            Object.entries(filterOptions).map(([key, values]) => (
              <div key={key} style={{ display: 'grid', gap: 6 }}>
                <div className={styles.hint}>{filterTitles[key] ? `${filterTitles[key]} (${key})` : key}</div>
                <CheckPicker
                  data={(values ?? []).map((v) => ({ value: v, label: v }))}
                  value={distDraft.filterValues?.[key] ?? []}
                  onChange={(v) => {
                    const filterValues = { ...(distDraft.filterValues ?? {}), [key]: Array.from(new Set((v as string[]) ?? [])) }
                    onDistDraftChange({ ...distDraft, filterValues })
                  }}
                  block
                  disabled={actualMode !== 'edit'}
                  placeholder="Выберите значения..."
                />
              </div>
            ))
          ) : (
            <div className={styles.hint}>Фильтры не настроены или АП не загружена</div>
          )}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.label}>Локации</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Input
              value={pointsQ}
              onChange={(v) => onPointsQChange(String(v ?? ''))}
              placeholder="Поиск по коду/адресу..."
              disabled={actualMode !== 'edit'}
            />
            <SelectPicker
              value={pointsRegion}
              onChange={(v) => onPointsRegionChange((v as string | null) ?? null)}
              data={(filterOptions.region ?? []).map((v) => ({ value: v, label: v }))}
              placeholder="Регион..."
              searchable
              block
              disabled={actualMode !== 'edit' || !(filterOptions.region ?? []).length}
              cleanable
              style={{ minWidth: 220 }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={actualMode !== 'edit' || pointsLoading || !points.length}
              onClick={() => {
                const pointIds = Array.from(new Set([...(distDraft.pointIds ?? []), ...points.map((p) => p.id)]))
                onDistDraftChange({ ...distDraft, pointIds })
              }}
            >
              Выбрать видимые
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={actualMode !== 'edit' || pointsLoading || !points.length}
              onClick={() => {
                const visible = new Set(points.map((p) => p.id))
                const pointIds = (distDraft.pointIds ?? []).filter((id) => !visible.has(id))
                onDistDraftChange({ ...distDraft, pointIds })
              }}
            >
              Снять видимые
            </Button>
          </div>

          {pointsLoading ? <div className={styles.hint}>Загрузка точек...</div> : null}
          <div className={styles.hint}>Выбрано точек: {distDraft.pointIds?.length ?? 0}</div>

          <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: 8 }}>
            {points.map((point: ShopPointItem) => {
              const checked = (distDraft.pointIds ?? []).includes(point.id)
              return (
                <div key={point.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 2px' }}>
                  <Checkbox
                    checked={checked}
                    disabled={actualMode !== 'edit'}
                    onChange={(_, next) => {
                      const set = new Set(distDraft.pointIds ?? [])
                      if (next) set.add(point.id)
                      else set.delete(point.id)
                      onDistDraftChange({ ...distDraft, pointIds: [...set] })
                    }}
                  />
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ fontWeight: 500 }}>{point.code}{point.pointName ? ` · ${point.pointName}` : ''}</div>
                    <div className={styles.hint}>{[point.regionCode && `рег. ${point.regionCode}`, point.cityName, point.address].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                </div>
              )
            })}
            {!points.length && !pointsLoading ? <div className={styles.hint}>Точек не найдено</div> : null}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button
          type="button"
          variant="primary"
          disabled={actualMode !== 'edit' || !activeDistributionCompanyId || isDistSaving}
          onClick={onSave}
        >
          {isDistSaving ? 'Сохранение...' : 'Сохранить распределение'}
        </Button>
      </div>
    </div>
  )
}
