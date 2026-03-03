from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.company import CompanyPublic
from app.schemas.user import UserPublic


router = APIRouter()


def to_user_public (user: User) -> UserPublic:
  company = user.company
  if company is None:
    company_public = CompanyPublic(id=user.company_id, name='—')
  else:
    company_public = CompanyPublic(id=company.id, name=company.name)

  return UserPublic(
    id=user.id,
    firstName=user.first_name,
    lastName=user.last_name,
    role=user.role.value if hasattr(user.role, 'value') else str(user.role),
    company=company_public,
    email=user.email,
    phone=user.phone,
    createdAt=user.created_at,
  )


@router.get('/me', response_model=UserPublic)
async def get_me (current_user: User = Depends(get_current_user)) -> UserPublic:
  return to_user_public(current_user)

