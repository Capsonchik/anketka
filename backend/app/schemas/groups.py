from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserGroupItem(BaseModel):
  id: UUID
  name: str
  membersCount: int
  createdAt: datetime


class UserGroupsResponse(BaseModel):
  items: list[UserGroupItem]


class CreateUserGroupRequest(BaseModel):
  name: str = Field(min_length=1, max_length=200)


class UpdateUserGroupRequest(BaseModel):
  name: str = Field(min_length=1, max_length=200)


class UserGroupMembersResponse(BaseModel):
  groupId: UUID
  userIds: list[UUID]


class ReplaceUserGroupMembersRequest(BaseModel):
  userIds: list[UUID] = Field(default_factory=list)


class UserGroupMembersImportError(BaseModel):
  row: int
  message: str


class UserGroupMembersImportResponse(BaseModel):
  added: int
  skipped: int
  errors: list[UserGroupMembersImportError] | None = None


class AddUserGroupMemberByEmailRequest(BaseModel):
  email: EmailStr


class UserGroupsForUserResponse(BaseModel):
  userId: UUID
  groupIds: list[UUID]


class ReplaceUserGroupsForUserRequest(BaseModel):
  groupIds: list[UUID] = Field(default_factory=list)

