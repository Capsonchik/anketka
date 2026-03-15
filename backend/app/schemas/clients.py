from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class CreateClientRequest(BaseModel):
  category: str | None = Field(default=None, max_length=120)
  name: str = Field(min_length=1, max_length=200)
  theme: dict = Field(default_factory=dict)
  filters: list = Field(default_factory=list)


class UpdateClientRequest(BaseModel):
  category: str | None = Field(default=None, max_length=120)
  name: str | None = Field(default=None, min_length=1, max_length=200)
  theme: dict | None = None
  filters: list | None = None
  isArchived: bool | None = None


class ClientPublic(BaseModel):
  id: UUID
  name: str
  category: str | None = None

  logoUrl: str | None = None
  backgroundUrl: str | None = None

  theme: dict
  filters: list
  isArchived: bool = False

  baseApProjectId: UUID | None = None

  createdAt: datetime


class ClientsResponse(BaseModel):
  items: list[ClientPublic]


class ClientApUploadResponse(BaseModel):
  clientId: UUID
  projectId: UUID
  created: int
  updated: int


class ClientApPreviewRow(BaseModel):
  name: str | None = None
  code: str | None = None
  address: str | None = None
  city: str | None = None
  region: str | None = None
  reg: str | None = None
  latitude: str | None = None
  longitude: str | None = None


class ClientApPreviewResponse(BaseModel):
  headers: list[str]
  totalRows: int
  rows: list[ClientApPreviewRow]


class ClientUsersImportError(BaseModel):
  row: int
  message: str


class ClientUsersImportResponse(BaseModel):
  created: int
  updated: int
  skipped: int
  errors: list[ClientUsersImportError] | None = None


class ClientUsersImportPreviewRow(BaseModel):
  email: str | None = None
  firstName: str | None = None
  lastName: str | None = None
  role: str | None = None
  phone: str | None = None
  note: str | None = None
  password: str | None = None


class ClientUsersImportPreviewResponse(BaseModel):
  headers: list[str]
  totalRows: int
  rows: list[ClientUsersImportPreviewRow]


class ClientOwnerItem(BaseModel):
  userId: UUID
  email: EmailStr
  createdAt: datetime


class ClientOwnersResponse(BaseModel):
  clientId: UUID
  items: list[ClientOwnerItem]


class GrantClientOwnerRequest(BaseModel):
  email: EmailStr

