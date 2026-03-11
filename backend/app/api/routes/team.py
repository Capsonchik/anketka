import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.db.session import get_db
from app.models.company_settings import CompanySettings
from app.models.project import Project
from app.models.shop_point import ShopPoint
from app.models.user import User
from app.models.user_point_access import UserPointAccess
from app.models.user_project_access import UserProjectAccess
from app.models.user_role import UserRole
from app.schemas.access import (
  BulkAssignRequest,
  BulkAssignResponse,
  UserPointAccessReplaceRequest,
  UserPointAccessResponse,
  UserProjectAccessReplaceRequest,
  UserProjectAccessResponse,
)
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

def _ensure_admin_or_manager_or_owner (user: User) -> None:
  if (user.platform_role or 'user') == 'owner':
    return
  if user.role not in (UserRole.admin, UserRole.manager):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')


def _company_id (current_user: User) -> UUID:
  return getattr(current_user, 'active_company_id', current_user.company_id)


def _normalize_region_codes (codes: list[str]) -> list[str]:
  out: list[str] = []
  seen: set[str] = set()
  for c in codes:
    v = str(c or '').strip()
    if not v:
      continue
    if v == '*':
      return ['*']
    if v.isdigit() and len(v) == 1:
      v = v.zfill(2)
    if v not in seen:
      seen.add(v)
      out.append(v)
  return out


def _normalize_access_role (value: str) -> str:
  v = (value or '').strip().lower()
  if v not in ('controller', 'coordinator'):
    raise HTTPException(status_code=400, detail='Некорректная роль доступа')
  return v


async def _ensure_project_manage_access (
  db: AsyncSession,
  *,
  actor: User,
  project_id: UUID,
) -> None:
  company_id = _company_id(actor)
  res = await db.execute(select(Project).where(Project.id == project_id, Project.company_id == company_id))
  project = res.scalar_one_or_none()
  if project is None:
    raise HTTPException(status_code=404, detail='Проект не найден')

  if (actor.platform_role or 'user') == 'owner':
    return
  if actor.role == UserRole.admin:
    return
  if actor.role == UserRole.manager and project.manager_user_id == actor.id:
    return
  raise HTTPException(status_code=403, detail='Недостаточно прав')


async def _get_base_ap_project_id (db: AsyncSession, *, company_id: UUID) -> UUID | None:
  res = await db.execute(select(CompanySettings.base_ap_project_id).where(CompanySettings.company_id == company_id))
  return res.scalar_one_or_none()


async def _ensure_target_user_in_company (db: AsyncSession, *, company_id: UUID, user_id: UUID) -> User:
  res = await db.execute(select(User).where(User.id == user_id, User.company_id == company_id))
  user = res.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=404, detail='Пользователь не найден')
  return user


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
  company_id = getattr(current_user, 'active_company_id', current_user.company_id)

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
    company_id=getattr(current_user, 'active_company_id', current_user.company_id),
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
  company_id = getattr(current_user, 'active_company_id', current_user.company_id)
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


@router.get(
  '/users/{user_id}/project-access',
  response_model=UserProjectAccessResponse,
  summary='Доступ пользователя к проектам/регионам',
)
async def get_user_project_access (
  user_id: UUID = Path(..., description='ID пользователя'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> UserProjectAccessResponse:
  _ensure_admin_or_manager_or_owner(current_user)
  company_id = _company_id(current_user)
  await _ensure_target_user_in_company(db, company_id=company_id, user_id=user_id)

  # Managers are allowed to view only scopes inside their projects.
  stmt = (
    select(UserProjectAccess)
    .join(Project, Project.id == UserProjectAccess.project_id)
    .where(UserProjectAccess.user_id == user_id, Project.company_id == company_id)
  )
  if (current_user.platform_role or 'user') != 'owner' and current_user.role == UserRole.manager:
    stmt = stmt.where(Project.manager_user_id == current_user.id)

  res = await db.execute(stmt)
  items = []
  for row in res.scalars().all():
    items.append(
      {
        'projectId': row.project_id,
        'accessRole': row.access_role,
        'regionCodes': list(row.region_codes or []),
      },
    )
  return UserProjectAccessResponse(userId=user_id, items=items)


@router.put(
  '/users/{user_id}/project-access',
  response_model=UserProjectAccessResponse,
  summary='Заменить доступ пользователя к проектам/регионам',
)
async def replace_user_project_access (
  payload: UserProjectAccessReplaceRequest,
  user_id: UUID = Path(..., description='ID пользователя'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> UserProjectAccessResponse:
  _ensure_admin_or_manager_or_owner(current_user)
  company_id = _company_id(current_user)
  target = await _ensure_target_user_in_company(db, company_id=company_id, user_id=user_id)

  normalized = []
  for item in payload.items:
    role = _normalize_access_role(item.accessRole)
    regions = _normalize_region_codes(item.regionCodes)
    normalized.append((item.projectId, role, regions))

  # Validate permissions: for manager, every project must be managed by them.
  for project_id, _, _ in normalized:
    await _ensure_project_manage_access(db, actor=current_user, project_id=project_id)

  # Replace only in allowed scope set for manager; owner/admin can replace all.
  delete_stmt = select(UserProjectAccess.id).join(Project, Project.id == UserProjectAccess.project_id).where(
    UserProjectAccess.user_id == user_id,
    Project.company_id == company_id,
  )
  if (current_user.platform_role or 'user') != 'owner' and current_user.role == UserRole.manager:
    delete_stmt = delete_stmt.where(Project.manager_user_id == current_user.id)

  existing_ids_res = await db.execute(delete_stmt)
  existing_ids = [x for x in existing_ids_res.scalars().all()]
  if existing_ids:
    await db.execute(
      UserProjectAccess.__table__.delete().where(UserProjectAccess.id.in_(existing_ids)),  # type: ignore
    )

  for project_id, role, regions in normalized:
    db.add(
      UserProjectAccess(
        user_id=target.id,
        project_id=project_id,
        access_role=role,
        region_codes=regions,
        assigned_by_user_id=current_user.id,
      ),
    )

  await db.commit()
  return await get_user_project_access(user_id=user_id, db=db, current_user=current_user)


@router.post(
  '/users/project-access/bulk',
  response_model=BulkAssignResponse,
  summary='Массово назначить доступ (проект+регионы) пользователям',
)
async def bulk_assign_project_access (
  payload: BulkAssignRequest,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> BulkAssignResponse:
  _ensure_admin_or_manager_or_owner(current_user)
  company_id = _company_id(current_user)
  await _ensure_project_manage_access(db, actor=current_user, project_id=payload.projectId)

  role = _normalize_access_role(payload.accessRole)
  regions = _normalize_region_codes(payload.regionCodes)

  user_ids = list(dict.fromkeys(payload.userIds))
  if not user_ids:
    return BulkAssignResponse(updatedUsers=0)

  # ensure all users belong to current company
  res = await db.execute(select(User.id).where(User.company_id == company_id, User.id.in_(user_ids)))
  allowed = set(res.scalars().all())
  if not allowed:
    raise HTTPException(status_code=400, detail='Пользователи не найдены')

  # upsert: delete existing for this project/user and insert
  await db.execute(
    UserProjectAccess.__table__.delete().where(  # type: ignore
      UserProjectAccess.project_id == payload.projectId,
      UserProjectAccess.user_id.in_(list(allowed)),
    ),
  )

  for uid in allowed:
    db.add(
      UserProjectAccess(
        user_id=uid,
        project_id=payload.projectId,
        access_role=role,
        region_codes=regions,
        assigned_by_user_id=current_user.id,
      ),
    )

  await db.commit()
  return BulkAssignResponse(updatedUsers=len(allowed))


@router.get(
  '/users/{user_id}/point-access',
  response_model=UserPointAccessResponse,
  summary='Привязки пользователя к локациям (точкам АП)',
)
async def get_user_point_access (
  user_id: UUID = Path(..., description='ID пользователя'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> UserPointAccessResponse:
  _ensure_admin_or_manager_or_owner(current_user)
  company_id = _company_id(current_user)
  await _ensure_target_user_in_company(db, company_id=company_id, user_id=user_id)

  base_project_id = await _get_base_ap_project_id(db, company_id=company_id)
  if base_project_id is None:
    return UserPointAccessResponse(userId=user_id, projectId=None, pointIds=[])

  stmt = (
    select(UserPointAccess.point_id)
    .join(ShopPoint, ShopPoint.id == UserPointAccess.point_id)
    .where(UserPointAccess.user_id == user_id, ShopPoint.project_id == base_project_id)
  )
  res = await db.execute(stmt)
  return UserPointAccessResponse(userId=user_id, projectId=base_project_id, pointIds=list(res.scalars().all()))


@router.put(
  '/users/{user_id}/point-access',
  response_model=UserPointAccessResponse,
  summary='Заменить привязки пользователя к локациям (точкам АП)',
)
async def replace_user_point_access (
  payload: UserPointAccessReplaceRequest,
  user_id: UUID = Path(..., description='ID пользователя'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> UserPointAccessResponse:
  _ensure_admin_or_manager_or_owner(current_user)
  company_id = _company_id(current_user)
  await _ensure_target_user_in_company(db, company_id=company_id, user_id=user_id)

  base_project_id = await _get_base_ap_project_id(db, company_id=company_id)
  if base_project_id is None:
    raise HTTPException(status_code=400, detail='Сначала загрузите адресную программу (АП)')

  # ensure base AP is within this company
  pres = await db.execute(select(Project.id).where(Project.id == base_project_id, Project.company_id == company_id))
  if pres.scalar_one_or_none() is None:
    raise HTTPException(status_code=404, detail='Проект АП не найден')

  point_ids = list(dict.fromkeys(payload.pointIds))
  if point_ids:
    pres = await db.execute(
      select(ShopPoint.id).where(
        ShopPoint.project_id == base_project_id,
        ShopPoint.id.in_(point_ids),
      ),
    )
    allowed = set(pres.scalars().all())
    if len(allowed) != len(point_ids):
      raise HTTPException(status_code=400, detail='Некоторые точки не найдены в АП')
  else:
    allowed = set()

  # delete only bindings for points from base AP
  base_point_ids = select(ShopPoint.id).where(ShopPoint.project_id == base_project_id)
  await db.execute(
    delete(UserPointAccess).where(
      UserPointAccess.user_id == user_id,
      UserPointAccess.point_id.in_(base_point_ids),
    ),
  )

  for pid in allowed:
    db.add(UserPointAccess(user_id=user_id, point_id=pid, assigned_by_user_id=current_user.id))

  await db.commit()
  return await get_user_point_access(user_id=user_id, db=db, current_user=current_user)

