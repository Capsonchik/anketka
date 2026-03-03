from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.schemas.company import CompanyPublic


class UserPublic(BaseModel):
  id: UUID
  firstName: str
  lastName: str
  role: str
  company: CompanyPublic
  email: EmailStr
  phone: str | None
  createdAt: datetime

