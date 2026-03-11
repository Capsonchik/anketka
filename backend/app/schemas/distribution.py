from uuid import UUID

from pydantic import BaseModel, Field


class DistributionCompanyItem(BaseModel):
  id: UUID
  name: str
  baseApProjectId: UUID | None = None
  hasAccess: bool


class UserCompaniesAccessResponse(BaseModel):
  userId: UUID
  items: list[DistributionCompanyItem]


class ReplaceUserCompaniesAccessRequest(BaseModel):
  companyIds: list[UUID] = Field(default_factory=list)


class UserCompanyDistributionResponse(BaseModel):
  userId: UUID
  companyId: UUID
  filterValues: dict = Field(default_factory=dict)
  pointIds: list[UUID] = Field(default_factory=list)


class ReplaceUserCompanyDistributionRequest(BaseModel):
  filterValues: dict = Field(default_factory=dict)
  pointIds: list[UUID] = Field(default_factory=list)


class FilterValueOption(BaseModel):
  key: str
  title: str | None = None
  values: list[str]


class CompanyFilterValuesResponse(BaseModel):
  companyId: UUID
  items: list[FilterValueOption]

