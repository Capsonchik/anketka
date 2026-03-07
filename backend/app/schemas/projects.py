from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectManagerPublic(BaseModel):
  id: UUID
  firstName: str
  lastName: str
  email: str


class ProjectItem(BaseModel):
  id: UUID
  name: str
  comment: str | None
  startDate: date
  endDate: date
  manager: ProjectManagerPublic | None
  createdAt: datetime


class ProjectsResponse(BaseModel):
  items: list[ProjectItem]

class ProjectResponse(BaseModel):
  project: ProjectItem


class CreateProjectRequest(BaseModel):
  name: str = Field(min_length=1, max_length=200)
  comment: str | None = Field(default=None, max_length=5000)
  startDate: date
  endDate: date
  managerId: UUID


class CreateProjectResponse(BaseModel):
  project: ProjectItem


class AddressbookCloneRequest(BaseModel):
  sourceProjectId: UUID


class RefRegionItem(BaseModel):
  code: str
  name: str


class RefRegionsResponse(BaseModel):
  items: list[RefRegionItem]


class RefCityItem(BaseModel):
  id: int
  name: str
  regionCode: str


class RefCitiesResponse(BaseModel):
  items: list[RefCityItem]


class ShopChainItem(BaseModel):
  id: UUID
  name: str


class ShopPointItem(BaseModel):
  id: UUID
  code: str
  pointName: str | None
  address: str | None
  regionCode: str | None
  cityName: str | None
  concat: str | None
  chain: ShopChainItem


class ShopPointsResponse(BaseModel):
  items: list[ShopPointItem]


class AddressbookUploadResponse(BaseModel):
  created: int
  updated: int

class AddressbookPointCreateRequest(BaseModel):
  chainName: str = Field(min_length=1, max_length=250)
  address: str = Field(min_length=1, max_length=5000)
  region: str | None = Field(default=None, max_length=250)
  city: str | None = Field(default=None, max_length=250)
  concat: str | None = Field(default=None, max_length=5000)

class AddressbookPointUpdateRequest(BaseModel):
  chainName: str = Field(min_length=1, max_length=250)
  address: str = Field(min_length=1, max_length=5000)
  region: str | None = Field(default=None, max_length=250)
  city: str | None = Field(default=None, max_length=250)
  concat: str | None = Field(default=None, max_length=5000)


class ChecklistItemPublic(BaseModel):
  id: UUID
  title: str
  chain: ShopChainItem
  itemsCount: int
  createdAt: datetime


class ChecklistsResponse(BaseModel):
  items: list[ChecklistItemPublic]


class ChecklistUploadCreatedItem(BaseModel):
  checklistId: UUID
  chain: ShopChainItem
  title: str
  itemsCount: int


class ChecklistUploadResponse(BaseModel):
  created: list[ChecklistUploadCreatedItem]


class ChecklistUpdateRequest(BaseModel):
  title: str = Field(min_length=1, max_length=250)


class ChecklistDetailsItem(BaseModel):
  itemId: UUID
  sortOrder: int
  category: str
  brand: str
  article: str | None
  name: str
  size: str | None


class ChecklistItemUpdateRequest(BaseModel):
  sortOrder: int | None = None
  category: str = Field(min_length=1, max_length=250)
  brand: str = Field(min_length=1, max_length=250)
  article: str | None = Field(default=None, max_length=120)
  name: str = Field(min_length=1, max_length=5000)
  size: str | None = Field(default=None, max_length=120)

class ChecklistItemCreateRequest(BaseModel):
  sortOrder: int | None = None
  category: str = Field(min_length=1, max_length=250)
  brand: str = Field(min_length=1, max_length=250)
  article: str | None = Field(default=None, max_length=120)
  name: str = Field(min_length=1, max_length=5000)
  size: str | None = Field(default=None, max_length=120)


class ChecklistDetailsResponse(BaseModel):
  checklistId: UUID
  title: str
  chain: ShopChainItem
  itemsCount: int
  createdAt: datetime
  items: list[ChecklistDetailsItem]


class ChecklistBrandItem(BaseModel):
  id: UUID
  name: str


class ChecklistProductItem(BaseModel):
  id: UUID
  article: str | None
  name: str
  size: str | None
  category: str


class ChecklistBrandProducts(BaseModel):
  brand: ChecklistBrandItem
  products: list[ChecklistProductItem]


class PointCatalogResponse(BaseModel):
  pointId: UUID
  chain: ShopChainItem
  brands: list[ChecklistBrandProducts]

