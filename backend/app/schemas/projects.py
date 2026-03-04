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

