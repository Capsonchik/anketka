from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.company import CompanyPublic


class UserPublic(BaseModel):
  id: UUID
  firstName: str
  lastName: str
  role: str
  platformRole: str
  permissions: list[str] = Field(default_factory=list)
  company: CompanyPublic
  email: EmailStr
  phone: str | None
  createdAt: datetime

