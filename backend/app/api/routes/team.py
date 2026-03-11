import secrets
from datetime import datetime, timezone
from io import BytesIO
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, UploadFile, status
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from openpyxl import load_workbook

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
  TeamResetPasswordResponse,
  TeamUpdateUserRequest,
  TeamUserDetailsResponse,
  TeamUserItem,
  TeamUsersImportError,
  TeamUsersImportResponse,
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
    phone=user.phone,
    company=company_public,
    role=user.role,
    profileCompany=user.profile_company,
    uiLanguage=user.ui_language,
    isActive=bool(user.is_active),
    note=user.note,
    createdAt=user.created_at,
    lastLoginAt=user.last_login_at,
  )


ROLE_LEVEL: dict[UserRole, int] = {
  UserRole.admin: 1,
  UserRole.manager: 2,
  UserRole.controller: 3,
  UserRole.coordinator: 4,
  UserRole.client: 5,
}


def _now_utc () -> datetime:
  return datetime.now(timezone.utc)


def _ensure_can_manage_user (actor: User, *, target_role: UserRole) -> None:
  if (actor.platform_role or 'user') == 'owner':
    return
  if actor.role == UserRole.admin:
    return
  if actor.role == UserRole.manager:
    if target_role == UserRole.admin:
      raise HTTPException(status_code=403, detail='Менеджер не может управлять администратором')
    return
  raise HTTPException(status_code=403, detail='Недостаточно прав')


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
  user_id: UUID | None = Query(default=None, description='Фильтр по ID пользователя'),
  is_active: bool | None = Query(default=None, description='Фильтр по активности'),
  role: UserRole | None = Query(default=None, description='Фильтр по роли'),
  email: str | None = Query(default=None, description='Фильтр по email'),
  phone: str | None = Query(default=None, description='Фильтр по телефону'),
  profile_company: str | None = Query(default=None, description='Фильтр по компании (профиль)'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> TeamUsersResponse:
  _ensure_admin_or_manager_or_owner(current_user)
  company_id = getattr(current_user, 'active_company_id', current_user.company_id)

  stmt = (
    select(User)
    .options(selectinload(User.company))
    .where(User.company_id == company_id)
    .order_by(User.created_at.desc())
  )
  if user_id is not None:
    stmt = stmt.where(User.id == user_id)
  if is_active is not None:
    stmt = stmt.where(User.is_active == is_active)
  if role is not None:
    stmt = stmt.where(User.role == role)
  if email:
    stmt = stmt.where(User.email.ilike(f'%{email.strip()}%'))
  if phone:
    stmt = stmt.where(User.phone.ilike(f'%{phone.strip()}%'))
  if profile_company:
    stmt = stmt.where(User.profile_company.ilike(f'%{profile_company.strip()}%'))
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
  _ensure_admin_or_manager_or_owner(current_user)
  _ensure_can_manage_user(current_user, target_role=payload.role)

  existing = await db.execute(select(User).where(User.email == str(payload.email)))
  if existing.scalar_one_or_none() is not None:
    raise HTTPException(status_code=400, detail='Пользователь с такой почтой уже существует')

  temporary_password = (payload.password or '').strip()
  if not temporary_password:
    temporary_password = secrets.token_urlsafe(9)
    temporary_password = temporary_password[:20]

  user = User(
    first_name=payload.firstName,
    last_name=payload.lastName,
    email=str(payload.email),
    phone=(payload.phone or None),
    role=payload.role,
    note=payload.note,
    profile_company=payload.profileCompany,
    ui_language=(payload.uiLanguage or 'ru'),
    is_active=bool(payload.isActive),
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
  _ensure_admin_or_manager_or_owner(current_user)
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


@router.patch(
  '/users/{user_id}',
  response_model=TeamUserDetailsResponse,
  summary='Обновить участника',
)
async def update_user (
  payload: TeamUpdateUserRequest,
  user_id: UUID = Path(..., description='ID пользователя'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> TeamUserDetailsResponse:
  _ensure_admin_or_manager_or_owner(current_user)
  company_id = _company_id(current_user)
  res = await db.execute(select(User).options(selectinload(User.company)).where(User.id == user_id, User.company_id == company_id))
  user = res.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=404, detail='Пользователь не найден')

  _ensure_can_manage_user(current_user, target_role=user.role)

  if payload.role is not None:
    _ensure_can_manage_user(current_user, target_role=payload.role)

  if user.id == current_user.id and payload.isActive is False:
    raise HTTPException(status_code=400, detail='Нельзя деактивировать самого себя')

  if payload.email is not None:
    next_email = str(payload.email)
    if next_email != user.email:
      exists = await db.execute(select(User.id).where(User.email == next_email, User.id != user.id))
      if exists.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail='Пользователь с такой почтой уже существует')
      user.email = next_email

  if payload.phone is not None:
    next_phone = payload.phone or None
    if next_phone != user.phone:
      if next_phone:
        exists = await db.execute(select(User.id).where(User.phone == next_phone, User.id != user.id))
        if exists.scalar_one_or_none() is not None:
          raise HTTPException(status_code=400, detail='Пользователь с таким телефоном уже существует')
      user.phone = next_phone

  if payload.firstName is not None:
    user.first_name = payload.firstName
  if payload.lastName is not None:
    user.last_name = payload.lastName
  if payload.role is not None:
    user.role = payload.role
  if payload.note is not None:
    user.note = payload.note
  if payload.profileCompany is not None:
    user.profile_company = payload.profileCompany
  if payload.uiLanguage is not None:
    user.ui_language = payload.uiLanguage
  if payload.isActive is not None:
    user.is_active = payload.isActive

  password_out = None
  if payload.password is not None:
    pw = (payload.password or '').strip()
    if not pw:
      raise HTTPException(status_code=400, detail='Пароль не должен быть пустым')
    user.temporary_password = pw
    user.password_hash = hash_password(pw)
    password_out = pw

  await db.commit()
  out = await db.execute(select(User).options(selectinload(User.company)).where(User.id == user.id))
  user = out.scalar_one()

  if password_out is None and current_user.role == UserRole.admin:
    password_out = user.temporary_password
  return TeamUserDetailsResponse(user=to_team_user_item(user), password=password_out)


@router.post(
  '/users/{user_id}/password/reset',
  response_model=TeamResetPasswordResponse,
  summary='Сбросить пароль участнику (временный)',
)
async def reset_user_password (
  user_id: UUID = Path(..., description='ID пользователя'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> TeamResetPasswordResponse:
  _ensure_admin_or_manager_or_owner(current_user)
  company_id = _company_id(current_user)
  res = await db.execute(select(User).where(User.id == user_id, User.company_id == company_id))
  user = res.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=404, detail='Пользователь не найден')

  _ensure_can_manage_user(current_user, target_role=user.role)

  temporary_password = secrets.token_urlsafe(9)[:20]
  user.temporary_password = temporary_password
  user.password_hash = hash_password(temporary_password)
  await db.commit()
  return TeamResetPasswordResponse(password=temporary_password)


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


def _normalize_header (value: str) -> str:
  return ''.join(ch for ch in str(value or '').strip().lower() if ch.isalnum() or ch in ('_', ' ')).replace('  ', ' ').strip()


def _split_fio (fio: str) -> tuple[str, str]:
  parts = [p for p in str(fio or '').strip().split() if p]
  if len(parts) >= 2:
    return parts[1], parts[0]
  if len(parts) == 1:
    return parts[0], '—'
  return '—', '—'


@router.post(
  '/users/import',
  response_model=TeamUsersImportResponse,
  summary='Импорт участников из Excel (.xlsx)',
)
async def import_users_xlsx (
  file: UploadFile = File(...),
  update_existing: bool = Query(default=False, description='Обновлять существующих пользователей (по email)'),
  generate_password_if_empty: bool = Query(default=True, description='Генерировать пароль, если Password пустой'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> TeamUsersImportResponse:
  _ensure_admin_or_manager_or_owner(current_user)

  if not file.filename or not file.filename.lower().endswith('.xlsx'):
    raise HTTPException(status_code=400, detail='Нужен файл .xlsx')

  raw = await file.read()
  if not raw:
    raise HTTPException(status_code=400, detail='Файл пустой')

  try:
    wb = load_workbook(BytesIO(raw), read_only=True, data_only=True)
    ws = wb.active
  except Exception:
    raise HTTPException(status_code=400, detail='Не удалось прочитать .xlsx')

  rows = list(ws.iter_rows(values_only=True))
  if not rows or not rows[0]:
    raise HTTPException(status_code=400, detail='В файле нет заголовка')

  header = [_normalize_header(x) for x in rows[0]]
  idx: dict[str, int] = {h: i for i, h in enumerate(header) if h}

  def col (*names: str) -> int | None:
    for n in names:
      k = _normalize_header(n)
      if k in idx:
        return idx[k]
    return None

  i_email = col('email', 'электронная почта', 'почта')
  if i_email is None:
    raise HTTPException(status_code=400, detail='Не найдена колонка Email')

  i_password = col('password', 'пароль')
  i_fio = col('fio', 'фио')
  i_company = col('company', 'компания')
  i_phone = col('phone', 'телефон')
  i_role = col('role', 'роль')
  i_lang = col('language', 'язык', 'язык интерфейса')
  i_note = col('note', 'заметка')
  i_active = col('active', 'активен')

  errors: list[TeamUsersImportError] = []
  items: list[dict] = []

  for r_idx, row in enumerate(rows[1:], start=2):
    email = (str(row[i_email] or '').strip() if i_email is not None else '').lower()
    if not email:
      errors.append(TeamUsersImportError(row=r_idx, message='Email обязателен'))
      continue

    fio = str(row[i_fio] or '').strip() if i_fio is not None else ''
    first_name = ''
    last_name = ''
    if fio:
      first_name, last_name = _split_fio(fio)

    profile_company = str(row[i_company] or '').strip() if i_company is not None else ''
    phone = str(row[i_phone] or '').strip() if i_phone is not None else ''
    role_raw = str(row[i_role] or '').strip().lower() if i_role is not None else ''
    lang = str(row[i_lang] or '').strip().lower() if i_lang is not None else ''
    note = str(row[i_note] or '').strip() if i_note is not None else ''
    active_raw = str(row[i_active] or '').strip().lower() if i_active is not None else ''

    password = str(row[i_password] or '').strip() if i_password is not None else ''
    if not password and generate_password_if_empty:
      password = secrets.token_urlsafe(9)[:20]

    is_active = True
    if active_raw in ('0', 'false', 'no', 'off', 'нет'):
      is_active = False
    if active_raw in ('1', 'true', 'yes', 'on', 'да'):
      is_active = True

    if role_raw and role_raw not in {r.value for r in UserRole}:
      errors.append(TeamUsersImportError(row=r_idx, message='Некорректная роль'))
      continue

    role = UserRole(role_raw) if role_raw else UserRole.manager

    if not first_name or first_name == '—':
      first_name = '—'
    if not last_name or last_name == '—':
      last_name = '—'

    if not lang:
      lang = 'ru'

    items.append(
      {
        'email': email,
        'password': password or None,
        'first_name': first_name,
        'last_name': last_name,
        'phone': phone or None,
        'role': role,
        'profile_company': profile_company or None,
        'ui_language': lang,
        'note': note or None,
        'is_active': is_active,
        'row': r_idx,
      },
    )

  if errors:
    return TeamUsersImportResponse(created=0, updated=0, skipped=0, errors=errors)

  company_id = _company_id(current_user)

  created = 0
  updated = 0
  skipped = 0

  for item in items:
    res = await db.execute(select(User).where(User.company_id == company_id, User.email == item['email']))
    existing = res.scalar_one_or_none()

    if existing is None:
      _ensure_can_manage_user(current_user, target_role=item['role'])
      pw = item['password'] or secrets.token_urlsafe(9)[:20]
      user = User(
        first_name=item['first_name'],
        last_name=item['last_name'],
        email=item['email'],
        phone=item['phone'],
        role=item['role'],
        profile_company=item['profile_company'],
        ui_language=item['ui_language'],
        is_active=bool(item['is_active']),
        note=item['note'],
        company_id=company_id,
        temporary_password=pw,
        password_hash=hash_password(pw),
      )
      db.add(user)
      created += 1
      continue

    if not update_existing:
      skipped += 1
      continue

    _ensure_can_manage_user(current_user, target_role=existing.role)
    _ensure_can_manage_user(current_user, target_role=item['role'])

    existing.first_name = item['first_name']
    existing.last_name = item['last_name']
    existing.phone = item['phone']
    existing.role = item['role']
    existing.profile_company = item['profile_company']
    existing.ui_language = item['ui_language']
    existing.is_active = bool(item['is_active'])
    existing.note = item['note']

    if item['password']:
      existing.temporary_password = item['password']
      existing.password_hash = hash_password(item['password'])
    updated += 1

  try:
    await db.commit()
  except Exception as err:
    await db.rollback()
    return TeamUsersImportResponse(created=0, updated=0, skipped=0, errors=[TeamUsersImportError(row=0, message=str(err))])

  return TeamUsersImportResponse(created=created, updated=updated, skipped=skipped, errors=None)

