from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal

from app.schemas.auth import validate_bcrypt_password


AuditorGender = Literal['male', 'female']


class AuditorItem(BaseModel):
  id: UUID
  lastName: str
  firstName: str
  middleName: str | None
  phone: str | None
  email: EmailStr | None
  city: str
  birthDate: date | None
  gender: AuditorGender | None
  createdAt: datetime


class AuditorsResponse(BaseModel):
  items: list[AuditorItem]


class AuditorCreateRequest(BaseModel):
  lastName: str = Field(min_length=1, max_length=120)
  firstName: str = Field(min_length=1, max_length=120)
  middleName: str | None = Field(default=None, max_length=120)
  phone: str | None = Field(default=None, max_length=32)
  email: EmailStr | None = None
  city: str = Field(min_length=1, max_length=250)
  birthDate: date
  gender: AuditorGender


class AuditorCreateResponse(BaseModel):
  auditor: AuditorItem


class AuditorUpdateRequest(BaseModel):
  lastName: str = Field(min_length=1, max_length=120)
  firstName: str = Field(min_length=1, max_length=120)
  middleName: str | None = Field(default=None, max_length=120)
  phone: str | None = Field(default=None, max_length=32)
  email: EmailStr | None = None
  city: str = Field(min_length=1, max_length=250)
  birthDate: date
  gender: AuditorGender


class AuditorUpdateResponse(BaseModel):
  auditor: AuditorItem


class AuditorSetPasswordRequest(BaseModel):
  password: str = Field(min_length=6, max_length=200)

  @field_validator('password')
  @classmethod
  def _password_max_72_bytes (cls, v: str) -> str:
    return validate_bcrypt_password(v)


class AuditorImportErrorItem(BaseModel):
  row: int
  message: str


class AuditorImportResponse(BaseModel):
  created: int
  skipped: int
  errors: list[AuditorImportErrorItem]


class ProjectSurveyAuditorAssignRequest(BaseModel):
  auditorIds: list[UUID] = Field(default_factory=list, min_length=1)


class ProjectSurveyAuditorsResponse(BaseModel):
  items: list[AuditorItem]


class AssignedByItem(BaseModel):
  id: UUID
  firstName: str
  lastName: str
  email: EmailStr


class ProjectSurveyAssignmentItem(BaseModel):
  auditor: AuditorItem
  assignedAt: datetime
  assignedBy: AssignedByItem | None
  status: str
  acceptedAt: datetime | None = None
  declinedAt: datetime | None = None
  inProgressAt: datetime | None = None


class ProjectSurveyAssignmentsResponse(BaseModel):
  items: list[ProjectSurveyAssignmentItem]

