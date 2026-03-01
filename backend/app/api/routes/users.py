from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserPublic


router = APIRouter()


def to_user_public (user: User) -> UserPublic:
  return UserPublic(
    id=user.id,
    firstName=user.first_name,
    lastName=user.last_name,
    organization=user.organization,
    email=user.email,
    phone=user.phone,
    createdAt=user.created_at,
  )


@router.get('/me', response_model=UserPublic)
async def get_me (current_user: User = Depends(get_current_user)) -> UserPublic:
  return to_user_public(current_user)

