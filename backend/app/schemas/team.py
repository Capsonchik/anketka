from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.user_role import UserRole
from app.schemas.company import CompanyPublic


class TeamUserItem(BaseModel):
  id: UUID
  publicId: int
  firstName: str
  lastName: str
  email: EmailStr
  phone: str | None = None
  company: CompanyPublic
  role: UserRole
  profileCompany: str | None = None
  uiLanguage: str
  isActive: bool
  permissions: list[str] = Field(default_factory=list)
  note: str | None
  createdAt: datetime
  lastLoginAt: datetime | None = None


class TeamUsersResponse(BaseModel):
  items: list[TeamUserItem]


class TeamCreateUserRequest(BaseModel):
  firstName: str = Field(min_length=1, max_length=120)
  lastName: str = Field(min_length=1, max_length=120)
  email: EmailStr
  phone: str | None = Field(default=None, max_length=32)
  role: UserRole
  profileCompany: str | None = Field(default=None, max_length=250)
  uiLanguage: str = Field(default='ru', max_length=12)
  isActive: bool = True
  permissions: list[str] = Field(default_factory=list)
  note: str | None = Field(default=None, max_length=2000)
  password: str | None = Field(default=None, min_length=6, max_length=200)


class TeamCreateUserResponse(BaseModel):
  user: TeamUserItem
  temporaryPassword: str


class TeamUserDetailsResponse(BaseModel):
  user: TeamUserItem
  password: str | None = Field(
    default=None,
    description='Временный пароль (только для администраторов, прототип). В проде хранить/отдавать пароль нельзя.',
  )


class TeamUpdateUserRequest(BaseModel):
  firstName: str | None = Field(default=None, min_length=1, max_length=120)
  lastName: str | None = Field(default=None, min_length=1, max_length=120)
  email: EmailStr | None = None
  phone: str | None = Field(default=None, max_length=32)
  role: UserRole | None = None
  profileCompany: str | None = Field(default=None, max_length=250)
  uiLanguage: str | None = Field(default=None, max_length=12)
  isActive: bool | None = None
  permissions: list[str] | None = None
  note: str | None = Field(default=None, max_length=2000)
  password: str | None = Field(default=None, min_length=6, max_length=200)


class TeamResetPasswordResponse(BaseModel):
  password: str = Field(
    description='Новый временный пароль (только для администраторов, прототип). В проде хранить/отдавать пароль нельзя.',
  )


class TeamUsersImportError(BaseModel):
  row: int
  message: str


class TeamUsersImportResponse(BaseModel):
  created: int
  updated: int
  skipped: int
  errors: list[TeamUsersImportError] | None = None


class PermissionItem(BaseModel):
  key: str
  label: str


class RoleDefaultPermissionsResponse(BaseModel):
  byRole: dict[UserRole, list[str]]
  availablePermissions: list[PermissionItem]


class RoleDefaultPermissionsUpdateRequest(BaseModel):
  byRole: dict[UserRole, list[str]]

