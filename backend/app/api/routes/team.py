import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.company import CompanyPublic
from app.schemas.team import (
  TeamCreateUserRequest,
  TeamCreateUserResponse,
  TeamUserDetailsResponse,
  TeamUserItem,
  TeamUsersResponse,
)


router = APIRouter()


def to_team_user_item (user: User) -> TeamUserItem:
  company = user.company
  if company is None:
    company_public = CompanyPublic(id=user.company_id, name='—')
  else:
    company_public = CompanyPublic(id=company.id, name=company.name)

  return TeamUserItem(
    id=user.id,
    firstName=user.first_name,
    lastName=user.last_name,
    email=user.email,
    company=company_public,
    role=user.role,
    note=user.note,
    createdAt=user.created_at,
  )


def _ensure_admin (user: User) -> None:
  if user.role != UserRole.admin:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')


@router.get(
  '/users',
  response_model=TeamUsersResponse,
  summary='Список участников',
  description='Возвращает список пользователей в рамках компании текущего пользователя. Поддерживает поиск и фильтр по роли.',
)
async def list_users (
  q: str | None = Query(default=None, description='Поиск по имени, фамилии или почте'),
  role: UserRole | None = Query(default=None, description='Фильтр по роли'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> TeamUsersResponse:
  company_id = current_user.company_id

  stmt = (
    select(User)
    .options(selectinload(User.company))
    .where(User.company_id == company_id)
    .order_by(User.created_at.desc())
  )
  if role is not None:
    stmt = stmt.where(User.role == role)
  if q:
    like = f'%{q.strip()}%'
    stmt = stmt.where(
      or_(
        User.first_name.ilike(like),
        User.last_name.ilike(like),
        User.email.ilike(like),
      ),
    )

  res = await db.execute(stmt)
  users = res.scalars().all()
  return TeamUsersResponse(items=[to_team_user_item(u) for u in users])


@router.post(
  '/users',
  response_model=TeamCreateUserResponse,
  status_code=status.HTTP_201_CREATED,
  summary='Добавить участника',
  description='Создаёт пользователя в компании текущего пользователя. Доступно только администратору.',
)
async def create_user (
  payload: TeamCreateUserRequest,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> TeamCreateUserResponse:
  _ensure_admin(current_user)

  existing = await db.execute(select(User).where(User.email == str(payload.email)))
  if existing.scalar_one_or_none() is not None:
    raise HTTPException(status_code=400, detail='Пользователь с такой почтой уже существует')

  temporary_password = secrets.token_urlsafe(9)
  temporary_password = temporary_password[:20]

  user = User(
    first_name=payload.firstName,
    last_name=payload.lastName,
    email=str(payload.email),
    phone=None,
    role=payload.role,
    note=payload.note,
    company_id=current_user.company_id,
    temporary_password=temporary_password,
    password_hash=hash_password(temporary_password),
  )
  db.add(user)
  await db.commit()
  res = await db.execute(select(User).options(selectinload(User.company)).where(User.id == user.id))
  user = res.scalar_one()

  return TeamCreateUserResponse(user=to_team_user_item(user), temporaryPassword=temporary_password)


@router.get(
  '/users/{user_id}',
  response_model=TeamUserDetailsResponse,
  summary='Карточка участника',
  description='Возвращает данные пользователя в рамках компании текущего пользователя. Администратор дополнительно получает временный пароль (прототип).',
)
async def get_user (
  user_id: UUID = Path(..., description='ID пользователя'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> TeamUserDetailsResponse:
  company_id = current_user.company_id
  res = await db.execute(
    select(User)
    .options(selectinload(User.company))
    .where(User.id == user_id, User.company_id == company_id),
  )
  user = res.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=404, detail='Пользователь не найден')

  password = user.temporary_password if current_user.role == UserRole.admin else None
  return TeamUserDetailsResponse(user=to_team_user_item(user), password=password)

