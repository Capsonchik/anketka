export type ProjectManagerPublic = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export type ProjectItem = {
  id: string
  name: string
  comment: string | null
  startDate: string
  endDate: string
  manager: ProjectManagerPublic | null
  createdAt: string
}

export type ProjectResponse = {
  project: ProjectItem
}

export type ShopChainItem = {
  id: string
  name: string
}

export type ShopPointItem = {
  id: string
  code: string
  pointName: string | null
  address: string | null
  regionCode: string | null
  cityName: string | null
  concat: string | null
  chain: ShopChainItem
}

export type ShopPointsResponse = {
  items: ShopPointItem[]
}

export type AddressbookUploadResponse = {
  created: number
  updated: number
}

export type AddressbookPointCreateRequest = {
  chainName: string
  address: string
  region?: string | null
  city?: string | null
  concat?: string | null
}

export type AddressbookPointUpdateRequest = AddressbookPointCreateRequest

export type RefRegionItem = {
  code: string
  name: string
}

export type RefRegionsResponse = {
  items: RefRegionItem[]
}

export type RefCityItem = {
  id: number
  name: string
  regionCode: string
}

export type RefCitiesResponse = {
  items: RefCityItem[]
}

export type ChecklistItemPublic = {
  id: string
  title: string
  chain: ShopChainItem
  itemsCount: number
  createdAt: string
}

export type ChecklistsResponse = {
  items: ChecklistItemPublic[]
}

export type ChecklistUploadCreatedItem = {
  checklistId: string
  chain: ShopChainItem
  title: string
  itemsCount: number
}

export type ChecklistUploadResponse = {
  created: ChecklistUploadCreatedItem[]
}

export type ChecklistDetailsItem = {
  itemId: string
  sortOrder: number
  category: string
  brand: string
  article: string | null
  name: string
  size: string | null
}

export type ChecklistDetailsResponse = {
  checklistId: string
  title: string
  chain: ShopChainItem
  itemsCount: number
  createdAt: string
  items: ChecklistDetailsItem[]
}

export type ChecklistItemUpdateRequest = {
  sortOrder?: number | null
  category: string
  brand: string
  article?: string | null
  name: string
  size?: string | null
}

export type ChecklistItemCreateRequest = ChecklistItemUpdateRequest

