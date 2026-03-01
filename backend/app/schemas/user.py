from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserPublic(BaseModel):
  id: UUID
  firstName: str
  lastName: str
  organization: str | None
  email: EmailStr
  phone: str
  createdAt: datetime

