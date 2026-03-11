from uuid import UUID

from pydantic import BaseModel, Field


class UserCompanyReportsResponse(BaseModel):
  userId: UUID
  companyId: UUID
  reportKeys: list[str] = Field(default_factory=list)


class ReplaceUserCompanyReportsRequest(BaseModel):
  reportKeys: list[str] = Field(default_factory=list)

