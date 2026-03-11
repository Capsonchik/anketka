from uuid import UUID

from pydantic import BaseModel, Field


class UserProjectAccessItem(BaseModel):
  projectId: UUID
  accessRole: str = Field(description='controller|coordinator')
  regionCodes: list[str] = Field(default_factory=list)


class UserProjectAccessResponse(BaseModel):
  userId: UUID
  items: list[UserProjectAccessItem]


class UserProjectAccessReplaceRequest(BaseModel):
  items: list[UserProjectAccessItem] = Field(default_factory=list)


class BulkAssignRequest(BaseModel):
  userIds: list[UUID]
  projectId: UUID
  accessRole: str = Field(description='controller|coordinator')
  regionCodes: list[str] = Field(default_factory=list)


class BulkAssignResponse(BaseModel):
  updatedUsers: int


class UserPointAccessResponse(BaseModel):
  userId: UUID
  projectId: UUID | None = None
  pointIds: list[UUID] = Field(default_factory=list)


class UserPointAccessReplaceRequest(BaseModel):
  pointIds: list[UUID] = Field(default_factory=list)

