from typing import Literal
from uuid import UUID

from pydantic import BaseModel


CloneMode = Literal['all', 'role_groups', 'distribution', 'reports']


class CloneUserRequest(BaseModel):
  sourceUserId: UUID
  mode: CloneMode


class CloneUserResponse(BaseModel):
  targetUserId: UUID
  sourceUserId: UUID
  mode: CloneMode
  changedRole: bool = False
  changedGroups: int = 0
  changedCompanies: int = 0
  changedCompanyDistributions: int = 0
  changedPoints: int = 0
  changedCompanyReports: int = 0

