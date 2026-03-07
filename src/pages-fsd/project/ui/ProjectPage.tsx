'use client'

import { useState } from 'react'

import { useProjectPageState } from '../model/useProjectPageState'
import styles from './ProjectPage.module.css'
import { ProjectTabs, type ProjectTabKey } from './ProjectTabs'
import { ProjectAddressbookTab } from './tabs/ProjectAddressbookTab'
import { ProjectChecklistsTab } from './tabs/ProjectChecklistsTab'
import { ProjectOverviewTab } from './tabs/ProjectOverviewTab'
import { ProjectSettingsTab } from './tabs/ProjectSettingsTab'

export function ProjectPage ({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<ProjectTabKey>('overview')

  const state = useProjectPageState(projectId)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className="titleH1">{state.project?.name || 'Проект'}</h1>
        </div>
        {state.isProjectLoading ? <div className={styles.hint}>Загрузка…</div> : null}
        {state.projectError ? <div className={styles.error}>{state.projectError}</div> : null}
        {state.project && !state.isProjectLoading && !state.projectError ? (
          <div className={styles.subtitle}>
            Ответственный: {state.managerLabel}
            {state.project.comment ? <span> · {state.project.comment}</span> : null}
          </div>
        ) : null}
      </div>

      {state.uploadError ? <div className={styles.error}>{state.uploadError}</div> : null}
      {state.uploadMessage ? <div className={styles.success}>{state.uploadMessage}</div> : null}

      <ProjectTabs value={tab} onChange={setTab} pointsCount={state.points.length} checklistsCount={state.checklists.length} />

      {tab === 'overview' ? (
        <ProjectOverviewTab
          project={state.project}
          points={state.points}
          checklists={state.checklists}
          isPointsLoading={state.isPointsLoading}
          isChecklistsLoading={state.isChecklistsLoading}
        />
      ) : null}

      {tab === 'addressbook' ? (
        <ProjectAddressbookTab
          addressbookFile={state.addressbookFile}
          onSelectFile={state.setAddressbookFile}
          onUpload={state.submitAddressbookUpload}
          isUploading={state.isUploadingAddressbook}
          onCreatePoint={state.submitCreatePoint}
          onUpdatePoint={state.submitUpdatePoint}
          onDeletePoint={state.submitDeletePoint}
          isCreatingPoint={state.isCreatingPoint}
          points={state.points}
          isPointsLoading={state.isPointsLoading}
          pointsError={state.pointsError}
        />
      ) : null}

      {tab === 'checklists' ? (
        <ProjectChecklistsTab
          projectId={projectId}
          checklistFile={state.checklistFile}
          onSelectFile={state.setChecklistFile}
          onUpload={state.submitChecklistUpload}
          isUploading={state.isUploadingChecklist}
          isMutating={state.isMutatingChecklist}
          onRename={state.submitChecklistUpdate}
          onDelete={state.submitChecklistDelete}
          checklists={state.checklists}
          isChecklistsLoading={state.isChecklistsLoading}
          checklistsError={state.checklistsError}
        />
      ) : null}

      {tab === 'settings' ? <ProjectSettingsTab project={state.project} /> : null}
    </div>
  )
}

