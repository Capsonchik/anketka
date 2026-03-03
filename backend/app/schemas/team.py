from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.user_role import UserRole


class TeamUserItem(BaseModel):
  id: UUID
  firstName: str
  lastName: str
  email: EmailStr
  role: UserRole
  note: str | None
  createdAt: datetime


class TeamUsersResponse(BaseModel):
  items: list[TeamUserItem]


class TeamCreateUserRequest(BaseModel):
  firstName: str = Field(min_length=1, max_length=120)
  lastName: str = Field(min_length=1, max_length=120)
  email: EmailStr
  role: UserRole
  note: str | None = Field(default=None, max_length=2000)


class TeamCreateUserResponse(BaseModel):
  user: TeamUserItem
  temporaryPassword: str


class TeamUserDetailsResponse(BaseModel):
  user: TeamUserItem
  password: str | None = Field(
    default=None,
    description='Временный пароль (только для администраторов, прототип). В проде хранить/отдавать пароль нельзя.',
  )

