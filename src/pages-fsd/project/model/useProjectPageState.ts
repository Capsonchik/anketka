import { useEffect, useMemo, useState } from 'react'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'

import { getApiErrorMessage } from '../lib/getApiErrorMessage'
import type {
  AddressbookUploadResponse,
  AddressbookPointCreateRequest,
  AddressbookPointUpdateRequest,
  ChecklistUploadResponse,
  ChecklistsResponse,
  ProjectResponse,
  ShopPointsResponse,
} from './types'

export function useProjectPageState (projectId: string) {
  const [project, setProject] = useState<ProjectResponse['project'] | null>(null)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [isProjectLoading, setIsProjectLoading] = useState(true)

  const [points, setPoints] = useState<ShopPointsResponse['items']>([])
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [isPointsLoading, setIsPointsLoading] = useState(true)

  const [checklists, setChecklists] = useState<ChecklistsResponse['items']>([])
  const [checklistsError, setChecklistsError] = useState<string | null>(null)
  const [isChecklistsLoading, setIsChecklistsLoading] = useState(true)

  const [addressbookFile, setAddressbookFile] = useState<File | null>(null)
  const [checklistFile, setChecklistFile] = useState<File | null>(null)

  const [isUploadingAddressbook, setIsUploadingAddressbook] = useState(false)
  const [isUploadingChecklist, setIsUploadingChecklist] = useState(false)
  const [isCreatingPoint, setIsCreatingPoint] = useState(false)
  const [isMutatingChecklist, setIsMutatingChecklist] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const managerLabel = useMemo(() => {
    const m = project?.manager
    if (!m) return '—'
    return `${m.firstName} ${m.lastName}`.trim() || m.email
  }, [project?.manager])

  async function loadProject () {
    setIsProjectLoading(true)
    setProjectError(null)
    try {
      const res = await axiosMainRequest.get<ProjectResponse>(apiRoutes.projects.project(projectId))
      setProject(res.data.project)
    } catch (err: unknown) {
      setProject(null)
      setProjectError(getApiErrorMessage(err))
    } finally {
      setIsProjectLoading(false)
    }
  }

  async function loadPoints () {
    setIsPointsLoading(true)
    setPointsError(null)
    try {
      const res = await axiosMainRequest.get<ShopPointsResponse>(apiRoutes.projects.addressbook(projectId))
      setPoints(res.data.items ?? [])
    } catch (err: unknown) {
      setPoints([])
      setPointsError(getApiErrorMessage(err))
    } finally {
      setIsPointsLoading(false)
    }
  }

  async function loadChecklists () {
    setIsChecklistsLoading(true)
    setChecklistsError(null)
    try {
      const res = await axiosMainRequest.get<ChecklistsResponse>(apiRoutes.projects.checklists(projectId))
      setChecklists(res.data.items ?? [])
    } catch (err: unknown) {
      setChecklists([])
      setChecklistsError(getApiErrorMessage(err))
    } finally {
      setIsChecklistsLoading(false)
    }
  }

  useEffect(() => {
    loadProject()
    loadPoints()
    loadChecklists()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function submitAddressbookUpload () {
    setUploadError(null)
    setUploadMessage(null)
    if (!addressbookFile) {
      setUploadError('Выберите файл адресной программы')
      return
    }

    setIsUploadingAddressbook(true)
    try {
      const fd = new FormData()
      fd.append('file', addressbookFile)
      const res = await axiosMainRequest.post<AddressbookUploadResponse>(apiRoutes.projects.addressbookUpload(projectId), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadMessage(`Адресная программа: добавлено ${res.data.created}, обновлено ${res.data.updated}`)
      setAddressbookFile(null)
      await loadPoints()
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setIsUploadingAddressbook(false)
    }
  }

  async function submitCreatePoint (payload: AddressbookPointCreateRequest) {
    setUploadError(null)
    setUploadMessage(null)
    setIsCreatingPoint(true)
    try {
      await axiosMainRequest.post(apiRoutes.projects.addressbookPointCreate(projectId), {
        chainName: payload.chainName,
        address: payload.address,
        region: payload.region ?? null,
        city: payload.city ?? null,
        concat: payload.concat ?? null,
      })
      setUploadMessage('Точка добавлена')
      await loadPoints()
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setIsCreatingPoint(false)
    }
  }

  async function submitUpdatePoint (pointId: string, payload: AddressbookPointUpdateRequest) {
    setUploadError(null)
    setUploadMessage(null)
    setIsCreatingPoint(true)
    try {
      await axiosMainRequest.patch(apiRoutes.projects.addressbookPoint(projectId, pointId), {
        chainName: payload.chainName,
        address: payload.address,
        region: payload.region ?? null,
        city: payload.city ?? null,
        concat: payload.concat ?? null,
      })
      setUploadMessage('Точка обновлена')
      await loadPoints()
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setIsCreatingPoint(false)
    }
  }

  async function submitDeletePoint (pointId: string) {
    setUploadError(null)
    setUploadMessage(null)
    setIsCreatingPoint(true)
    try {
      await axiosMainRequest.delete(apiRoutes.projects.addressbookPoint(projectId, pointId))
      setUploadMessage('Точка удалена')
      await loadPoints()
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setIsCreatingPoint(false)
    }
  }

  async function submitChecklistUpload () {
    setUploadError(null)
    setUploadMessage(null)
    if (!checklistFile) {
      setUploadError('Выберите файл чек-листа')
      return
    }

    setIsUploadingChecklist(true)
    try {
      const fd = new FormData()
      fd.append('file', checklistFile)
      const res = await axiosMainRequest.post<ChecklistUploadResponse>(apiRoutes.projects.checklistsUpload(projectId), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const created = res.data.created ?? []
      const createdCount = created.length
      if (createdCount) {
        const sample = created
          .slice(0, 3)
          .map((x) => `${x.chain.name}: ${x.itemsCount}`)
          .join(', ')
        setUploadMessage(`Чек-листы: создано ${createdCount}${sample ? ` (${sample}${createdCount > 3 ? '…' : ''})` : ''}`)
      } else {
        setUploadMessage('Чек-листы: ничего не создано')
      }
      setChecklistFile(null)
      await loadChecklists()
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setIsUploadingChecklist(false)
    }
  }

  async function submitChecklistUpdate (checklistId: string, title: string) {
    setUploadError(null)
    setUploadMessage(null)
    setIsMutatingChecklist(true)
    try {
      await axiosMainRequest.patch(apiRoutes.projects.checklistDetails(projectId, checklistId), { title })
      setUploadMessage('Чек-лист обновлён')
      await loadChecklists()
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setIsMutatingChecklist(false)
    }
  }

  async function submitChecklistDelete (checklistId: string) {
    setUploadError(null)
    setUploadMessage(null)
    setIsMutatingChecklist(true)
    try {
      await axiosMainRequest.delete(apiRoutes.projects.checklistDetails(projectId, checklistId))
      setUploadMessage('Чек-лист удалён')
      await loadChecklists()
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setIsMutatingChecklist(false)
    }
  }

  return {
    project,
    managerLabel,
    projectError,
    isProjectLoading,

    points,
    pointsError,
    isPointsLoading,

    checklists,
    checklistsError,
    isChecklistsLoading,

    addressbookFile,
    setAddressbookFile,
    checklistFile,
    setChecklistFile,

    isUploadingAddressbook,
    isUploadingChecklist,
    isCreatingPoint,
    isMutatingChecklist,
    uploadMessage,
    uploadError,

    submitAddressbookUpload,
    submitCreatePoint,
    submitUpdatePoint,
    submitDeletePoint,
    submitChecklistUpload,
    submitChecklistUpdate,
    submitChecklistDelete,
  }
}

