from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.auth import AuthTokens, validate_bcrypt_password


class AuditorLoginRequest(BaseModel):
  email: EmailStr
  password: str = Field(min_length=1, max_length=200)

  @field_validator('password')
  @classmethod
  def _password_max_72_bytes (cls, v: str) -> str:
    return validate_bcrypt_password(v)


class AuditorPublic(BaseModel):
  id: UUID
  companyId: UUID
  firstName: str
  lastName: str
  middleName: str | None = None
  email: EmailStr | None = None
  phone: str | None = None
  city: str


class AuditorAuthResponse(BaseModel):
  auditor: AuditorPublic
  tokens: AuthTokens


class AuditorMeResponse(BaseModel):
  auditor: AuditorPublic


class AuditorAssignmentItem(BaseModel):
  projectId: UUID
  projectName: str
  surveyId: UUID
  surveyTitle: str
  status: str
  assignedAt: datetime
  acceptedAt: datetime | None = None
  declinedAt: datetime | None = None
  inProgressAt: datetime | None = None
  inviteToken: UUID


class AuditorAssignmentsResponse(BaseModel):
  items: list[AuditorAssignmentItem]


class AuditorAssignmentStatusRequest(BaseModel):
  status: str = Field(description='accepted|declined')

