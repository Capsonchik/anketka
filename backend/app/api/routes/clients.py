import os
import secrets
from datetime import date
from io import BytesIO
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from PIL import Image, ImageOps

from app.api.deps import get_current_user
from app.api.routes.projects import _AddressbookRefResolver, _make_autocode, _make_unique_point_code, _lower_key, _norm_optional, _read_tabular_file  # type: ignore
from app.core.security import hash_password
from app.db.session import get_db
from app.models.company import Company
from app.models.company_settings import CompanySettings
from app.models.owner_company_access import OwnerCompanyAccess
from app.models.user_company_access import UserCompanyAccess
from app.models.project import Project
from app.models.shop_point import ShopPoint
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.clients import (
  ClientApUploadResponse,
  ClientOwnerItem,
  ClientOwnersResponse,
  ClientPublic,
  ClientsResponse,
  ClientUsersImportError,
  ClientUsersImportResponse,
  CreateClientRequest,
  GrantClientOwnerRequest,
  UpdateClientRequest,
)
from app.api.routes.projects import _get_or_create_chain  # type: ignore


router = APIRouter()


def _ensure_owner (user: User) -> None:
  if (user.platform_role or 'user') != 'owner':
    raise HTTPException(status_code=403, detail='Недостаточно прав')


def _uploads_root () -> str:
  return os.getenv('UPLOAD_ROOT', 'uploads')


def _company_dir (company_id: UUID) -> str:
  return os.path.join(_uploads_root(), 'companies', str(company_id))

MAX_IMAGE_BYTES = 15 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 40_000_000


async def _ensure_owner_access (db: AsyncSession, *, owner_user_id: UUID, company_id: UUID) -> None:
  res = await db.execute(
    select(OwnerCompanyAccess.id).where(
      OwnerCompanyAccess.owner_user_id == owner_user_id,
      OwnerCompanyAccess.company_id == company_id,
    ),
  )
  if res.scalar_one_or_none() is None:
    raise HTTPException(status_code=403, detail='Нет доступа к клиенту')


async def _get_settings (db: AsyncSession, company_id: UUID) -> CompanySettings:
  res = await db.execute(select(CompanySettings).where(CompanySettings.company_id == company_id))
  row = res.scalar_one_or_none()
  if row is not None:
    return row
  row = CompanySettings(company_id=company_id)
  db.add(row)
  await db.commit()
  out = await db.execute(select(CompanySettings).where(CompanySettings.company_id == company_id))
  return out.scalar_one()


def _to_client_public (company: Company, settings: CompanySettings | None) -> ClientPublic:
  logo_url = None
  background_url = None
  category = None
  theme: dict = {}
  filters: list = []
  is_archived = False
  base_ap_project_id = None

  if settings is not None:
    category = settings.category
    theme = settings.theme or {}
    filters = settings.filters or []
    is_archived = bool(getattr(settings, 'is_archived', False))
    base_ap_project_id = settings.base_ap_project_id
    if settings.logo_path:
      logo_url = f'/api/v1/clients/{company.id}/logo'
    if settings.background_path:
      background_url = f'/api/v1/clients/{company.id}/background'

  return ClientPublic(
    id=company.id,
    name=company.name,
    category=category,
    logoUrl=logo_url,
    backgroundUrl=background_url,
    theme=theme,
    filters=filters,
    isArchived=is_archived,
    baseApProjectId=base_ap_project_id,
    createdAt=company.created_at,
  )


@router.get('', response_model=ClientsResponse, summary='Список клиентов')
async def list_clients (
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
  includeArchived: bool = Query(default=False, description='Показывать архивные'),
) -> ClientsResponse:
  is_owner = (current_user.platform_role or 'user') == 'owner'

  if is_owner:
    archived_cond = CompanySettings.is_archived.is_(False) | (CompanySettings.company_id.is_(None))  # type: ignore
    stmt = (
      select(Company, CompanySettings)
      .join(OwnerCompanyAccess, OwnerCompanyAccess.company_id == Company.id)
      .outerjoin(CompanySettings, CompanySettings.company_id == Company.id)
      .where(OwnerCompanyAccess.owner_user_id == current_user.id)
      .order_by(Company.created_at.desc())
    )
    if not includeArchived:
      stmt = stmt.where(archived_cond)
  else:
    # non-owner can see own company + explicitly granted companies
    stmt = (
      select(Company, CompanySettings)
      .outerjoin(CompanySettings, CompanySettings.company_id == Company.id)
      .outerjoin(UserCompanyAccess, UserCompanyAccess.company_id == Company.id)
      .where((Company.id == current_user.company_id) | (UserCompanyAccess.user_id == current_user.id))
      .order_by(Company.created_at.desc())
    )

  res = await db.execute(stmt)
  items: list[ClientPublic] = []
  for company, settings in res.all():
    items.append(_to_client_public(company, settings))
  return ClientsResponse(items=items)


@router.post('', response_model=ClientPublic, status_code=status.HTTP_201_CREATED, summary='Создать клиента')
async def create_client (
  payload: CreateClientRequest,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientPublic:
  _ensure_owner(current_user)

  name = payload.name.strip()
  exists = await db.execute(select(Company.id).where(Company.name == name))
  if exists.scalar_one_or_none() is not None:
    raise HTTPException(status_code=400, detail='Клиент с таким названием уже существует')

  company = Company(name=name)
  db.add(company)
  await db.flush()

  settings = CompanySettings(
    company_id=company.id,
    category=(payload.category.strip() if payload.category else None),
    theme=payload.theme or {},
    filters=payload.filters or [],
  )
  db.add(settings)

  db.add(OwnerCompanyAccess(id=uuid4(), owner_user_id=current_user.id, company_id=company.id))

  await db.commit()

  out = await db.execute(
    select(Company, CompanySettings)
    .outerjoin(CompanySettings, CompanySettings.company_id == Company.id)
    .where(Company.id == company.id),
  )
  company, settings = out.one()
  return _to_client_public(company, settings)


@router.patch('/{client_id}', response_model=ClientPublic, summary='Обновить клиента')
async def update_client (
  payload: UpdateClientRequest,
  client_id: UUID = Path(..., description='ID клиента'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientPublic:
  _ensure_owner(current_user)
  await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)

  res = await db.execute(select(Company).where(Company.id == client_id))
  company = res.scalar_one_or_none()
  if company is None:
    raise HTTPException(status_code=404, detail='Клиент не найден')

  settings = await _get_settings(db, client_id)

  if payload.name is not None:
    next_name = payload.name.strip()
    if next_name != company.name:
      exists = await db.execute(select(Company.id).where(Company.name == next_name, Company.id != company.id))
      if exists.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail='Клиент с таким названием уже существует')
    company.name = next_name
  if payload.category is not None:
    settings.category = payload.category.strip() if payload.category.strip() else None
  if payload.theme is not None:
    settings.theme = payload.theme
  if payload.filters is not None:
    settings.filters = payload.filters
  if getattr(payload, 'isArchived', None) is not None:
    settings.is_archived = bool(payload.isArchived)

  await db.commit()

  out = await db.execute(
    select(Company, CompanySettings)
    .outerjoin(CompanySettings, CompanySettings.company_id == Company.id)
    .where(Company.id == client_id),
  )
  company, settings = out.one()
  return _to_client_public(company, settings)


async def _upload_asset (
  *,
  kind: str,
  file: UploadFile,
  company_id: UUID,
  db: AsyncSession,
) -> str:
  raw = await file.read()
  if not raw:
    raise HTTPException(status_code=400, detail='Файл пустой')
  if len(raw) > MAX_IMAGE_BYTES:
    raise HTTPException(status_code=400, detail='Файл слишком большой')

  os.makedirs(_company_dir(company_id), exist_ok=True)

  filename = f'{kind}.webp'
  path = os.path.join(_company_dir(company_id), filename)

  try:
    img = Image.open(BytesIO(raw))
    img = ImageOps.exif_transpose(img)
  except Exception:
    raise HTTPException(status_code=400, detail='Не удалось прочитать изображение')

  # Resize with aspect ratio
  if kind == 'logo':
    max_size = (512, 512)
  else:
    max_size = (1920, 1080)

  img.thumbnail(max_size, Image.Resampling.LANCZOS)

  has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in (img.info or {}))
  if has_alpha:
    img = img.convert('RGBA')
  else:
    img = img.convert('RGB')

  try:
    if kind == 'logo' and has_alpha:
      img.save(path, format='WEBP', lossless=True, method=6)
    else:
      img.save(path, format='WEBP', quality=82, method=6)
  except Exception:
    raise HTTPException(status_code=500, detail='Не удалось сохранить изображение')

  return path


@router.post('/{client_id}/logo', response_model=ClientPublic, summary='Загрузить лого клиента')
async def upload_client_logo (
  client_id: UUID = Path(..., description='ID клиента'),
  file: UploadFile = File(...),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientPublic:
  _ensure_owner(current_user)
  await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)

  res = await db.execute(select(Company).where(Company.id == client_id))
  company = res.scalar_one_or_none()
  if company is None:
    raise HTTPException(status_code=404, detail='Клиент не найден')

  settings = await _get_settings(db, client_id)
  path = await _upload_asset(kind='logo', file=file, company_id=client_id, db=db)
  settings.logo_path = path
  await db.commit()

  return _to_client_public(company, settings)


@router.get('/{client_id}/logo', summary='Скачать лого клиента')
async def get_client_logo (
  client_id: UUID = Path(..., description='ID клиента'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  is_owner = (current_user.platform_role or 'user') == 'owner'
  if is_owner:
    await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)
  elif current_user.company_id != client_id:
    raise HTTPException(status_code=403, detail='Недостаточно прав')

  settings = await _get_settings(db, client_id)
  if not settings.logo_path or not os.path.exists(settings.logo_path):
    raise HTTPException(status_code=404, detail='Лого не найдено')
  return FileResponse(settings.logo_path)


@router.post('/{client_id}/background', response_model=ClientPublic, summary='Загрузить фон клиента')
async def upload_client_background (
  client_id: UUID = Path(..., description='ID клиента'),
  file: UploadFile = File(...),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientPublic:
  _ensure_owner(current_user)
  await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)

  res = await db.execute(select(Company).where(Company.id == client_id))
  company = res.scalar_one_or_none()
  if company is None:
    raise HTTPException(status_code=404, detail='Клиент не найден')

  settings = await _get_settings(db, client_id)
  path = await _upload_asset(kind='background', file=file, company_id=client_id, db=db)
  settings.background_path = path
  await db.commit()

  return _to_client_public(company, settings)


@router.get('/{client_id}/background', summary='Скачать фон клиента')
async def get_client_background (
  client_id: UUID = Path(..., description='ID клиента'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  is_owner = (current_user.platform_role or 'user') == 'owner'
  if is_owner:
    await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)
  elif current_user.company_id != client_id:
    raise HTTPException(status_code=403, detail='Недостаточно прав')

  settings = await _get_settings(db, client_id)
  if not settings.background_path or not os.path.exists(settings.background_path):
    raise HTTPException(status_code=404, detail='Фон не найден')
  return FileResponse(settings.background_path)


async def _get_or_create_base_ap_project (
  db: AsyncSession,
  *,
  client_id: UUID,
  actor_user_id: UUID,
) -> UUID:
  settings = await _get_settings(db, client_id)
  if settings.base_ap_project_id is not None:
    res = await db.execute(
      select(Project.id).where(Project.id == settings.base_ap_project_id, Project.company_id == client_id),
    )
    existing_id = res.scalar_one_or_none()
    if existing_id is not None:
      return existing_id

  today = date.today()
  project = Project(
    company_id=client_id,
    manager_user_id=actor_user_id,
    name='АП (база)',
    comment='Служебный проект для адресной программы клиента',
    start_date=today,
    end_date=today,
  )
  db.add(project)
  await db.flush()

  settings.base_ap_project_id = project.id
  await db.commit()
  return project.id


@router.post(
  '/{client_id}/ap/upload',
  response_model=ClientApUploadResponse,
  summary='Загрузить адресную программу клиента (АП)',
)
async def upload_client_ap (
  client_id: UUID = Path(..., description='ID клиента'),
  file: UploadFile = File(...),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientApUploadResponse:
  _ensure_owner(current_user)
  await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)

  project_id = await _get_or_create_base_ap_project(db, client_id=client_id, actor_user_id=current_user.id)

  raw = await file.read()
  rows = _read_tabular_file(file, raw)
  if not rows:
    raise HTTPException(status_code=400, detail='Файл пустой или не удалось прочитать строки')

  # Маппинг колонок (варианты названий)
  def pick (row: dict[str, str], keys: list[str]) -> str | None:
    for k in keys:
      for rk, rv in row.items():
        if _lower_key(rk) == _lower_key(k):
          v = _norm_optional(rv)
          if v:
            return v
    return None

  resolver = _AddressbookRefResolver(db)

  created = 0
  updated = 0

  for r in rows:
    chain_name = pick(r, ['магазин', 'сеть', 'shop', 'shop_chain', 'name'])
    code = pick(r, ['code', 'код', 'id', 'точка', 'point', 'point_code'])
    address = pick(r, ['address', 'адрес'])
    region_in = pick(r, ['region', 'регион', 'region_code', 'reg_id'])
    city_in = pick(r, ['city', 'город'])
    concat = pick(r, ['concat'])

    if not chain_name:
      continue

    region_code, city_name = await resolver.resolve(city_in, region_in)

    if not code:
      code = _make_autocode(chain_name, region_code or region_in, city_name or city_in, address, concat)
      if not code:
        continue

    chain = await _get_or_create_chain(db, client_id, chain_name)

    # store extra columns as attrs for distribution/filters
    known_keys = {
      _lower_key('магазин'),
      _lower_key('сеть'),
      _lower_key('shop'),
      _lower_key('shop_chain'),
      _lower_key('name'),
      _lower_key('code'),
      _lower_key('код'),
      _lower_key('id'),
      _lower_key('точка'),
      _lower_key('point'),
      _lower_key('point_code'),
      _lower_key('address'),
      _lower_key('адрес'),
      _lower_key('region'),
      _lower_key('регион'),
      _lower_key('region_code'),
      _lower_key('reg_id'),
      _lower_key('city'),
      _lower_key('город'),
      _lower_key('concat'),
    }
    attrs: dict[str, str] = {}
    for rk, rv in r.items():
      k = _lower_key(rk)
      if not k or k in known_keys:
        continue
      v = _norm_optional(rv)
      if not v:
        continue
      if len(attrs) >= 50:
        break
      attrs[k[:64]] = v[:250]

    existing_res = await db.execute(
      select(ShopPoint).where(ShopPoint.project_id == project_id, ShopPoint.code == code),
    )
    point = existing_res.scalar_one_or_none()
    if point is None:
      unique_code = await _make_unique_point_code(db, project_id, code)
      point = ShopPoint(
        project_id=project_id,
        chain_id=chain.id,
        code=unique_code,
        point_name=None,
        address=address,
        region_code=region_code,
        city_name=city_name,
        concat=concat,
        attrs=attrs,
      )
      db.add(point)
      created += 1
    else:
      point.chain_id = chain.id
      point.address = address
      point.region_code = region_code
      point.city_name = city_name
      point.concat = concat
      point.attrs = attrs
      updated += 1

  await db.commit()
  return ClientApUploadResponse(clientId=client_id, projectId=project_id, created=created, updated=updated)


def _normalize_email (value: str | None) -> str:
  return (value or '').strip().lower()


def _parse_role (value: str | None) -> UserRole | None:
  raw = (value or '').strip().lower()
  if not raw:
    return None
  aliases: dict[str, UserRole] = {
    'admin': UserRole.admin,
    'админ': UserRole.admin,
    'администратор': UserRole.admin,
    'manager': UserRole.manager,
    'менеджер': UserRole.manager,
    'controller': UserRole.controller,
    'контролер': UserRole.controller,
    'контролёр': UserRole.controller,
    'coordinator': UserRole.coordinator,
    'координатор': UserRole.coordinator,
    'client': UserRole.client,
    'клиент': UserRole.client,
  }
  return aliases.get(raw)


def _make_password (raw: str | None) -> str | None:
  s = (raw or '').strip()
  return s if s else None


@router.post(
  '/{client_id}/users/import',
  response_model=ClientUsersImportResponse,
  summary='Импорт пользователей клиента (Excel/CSV)',
)
async def import_client_users (
  client_id: UUID = Path(..., description='ID клиента'),
  file: UploadFile = File(...),
  updateExisting: bool = Query(default=True, description='Обновлять существующих пользователей по email/ID'),
  generateRandomPasswordIfEmpty: bool = Query(default=True, description='Генерировать пароль, если Password пустой'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientUsersImportResponse:
  _ensure_owner(current_user)
  await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)

  raw = await file.read()
  rows = _read_tabular_file(file, raw)
  if not rows:
    raise HTTPException(status_code=400, detail='Файл пустой или не удалось прочитать строки')

  def pick (row: dict[str, str], keys: list[str]) -> str | None:
    for k in keys:
      for rk, rv in row.items():
        if _lower_key(rk) == _lower_key(k):
          v = (rv or '').strip()
          return v if v else None
    return None

  errors: list[ClientUsersImportError] = []
  created = 0
  updated = 0
  skipped = 0

  prepared: list[dict] = []
  seen_emails: set[str] = set()

  for idx, r in enumerate(rows, start=2):
    email = _normalize_email(pick(r, ['email', 'почта', 'e-mail']))
    if not email:
      skipped += 1
      continue

    if email in seen_emails:
      errors.append(ClientUsersImportError(row=idx, message='Дублирующийся email в файле'))
      continue
    seen_emails.add(email)

    user_id_raw = pick(r, ['id', 'ID', 'user_id', 'userId'])
    user_id: UUID | None = None
    if user_id_raw:
      try:
        user_id = UUID(user_id_raw)
      except Exception:
        errors.append(ClientUsersImportError(row=idx, message='Некорректный ID пользователя'))
        continue

    role_raw = pick(r, ['роль', 'role'])
    role = _parse_role(role_raw) or UserRole.manager

    first_name = pick(r, ['имя', 'firstName', 'first_name'])
    last_name = pick(r, ['фамилия', 'lastName', 'last_name'])
    fio = pick(r, ['фио', 'fullName', 'full_name', 'name'])
    if fio and (not first_name or not last_name):
      parts = [x for x in fio.replace('\t', ' ').split(' ') if x.strip()]
      if len(parts) >= 2:
        last_name = last_name or parts[0]
        first_name = first_name or parts[1]

    if not first_name or not last_name:
      errors.append(ClientUsersImportError(row=idx, message='ФИО обязательно (Имя и Фамилия)'))
      continue

    phone = pick(r, ['телефон', 'phone'])
    phone = phone.strip() if phone else None

    note = pick(r, ['заметка', 'note'])
    note = note.strip() if note else None

    password = _make_password(pick(r, ['password', 'пароль']))
    prepared.append(
      {
        'row': idx,
        'id': user_id,
        'email': email,
        'firstName': first_name.strip(),
        'lastName': last_name.strip(),
        'role': role,
        'phone': phone,
        'note': note,
        'password': password,
      },
    )

  if errors:
    raise HTTPException(status_code=400, detail=ClientUsersImportResponse(created=0, updated=0, skipped=skipped, errors=errors).model_dump())

  emails = [x['email'] for x in prepared]
  existing_by_email: dict[str, User] = {}
  if emails:
    res = await db.execute(select(User).where(User.email.in_(emails)))
    for u in res.scalars().all():
      existing_by_email[_normalize_email(u.email)] = u

  # validate phone uniqueness (within batch + against DB)
  batch_phones: dict[str, int] = {}
  phones = []
  for x in prepared:
    p = (x.get('phone') or '').strip()
    if not p:
      continue
    if p in batch_phones:
      errors.append(ClientUsersImportError(row=x['row'], message='Дублирующийся телефон в файле'))
      continue
    batch_phones[p] = x['row']
    phones.append(p)

  if phones:
    pres = await db.execute(select(User.id, User.phone).where(User.phone.in_(phones)))
    phone_owner_by_phone: dict[str, UUID] = {}
    for uid, ph in pres.all():
      if ph:
        phone_owner_by_phone[str(ph)] = uid
    for x in prepared:
      p = (x.get('phone') or '').strip()
      if not p:
        continue
      owner_id = phone_owner_by_phone.get(p)
      if owner_id is None:
        continue
      existing = existing_by_email.get(x['email'])
      if existing is not None and existing.id == owner_id:
        continue
      errors.append(ClientUsersImportError(row=x['row'], message='Телефон уже используется другим пользователем'))

  if errors:
    raise HTTPException(status_code=400, detail=ClientUsersImportResponse(created=0, updated=0, skipped=skipped, errors=errors).model_dump())

  # apply (atomic)
  for x in prepared:
    existing = existing_by_email.get(x['email'])
    if existing is not None:
      if not updateExisting:
        errors.append(ClientUsersImportError(row=x['row'], message='Пользователь уже существует (updateExisting=false)'))
        continue
      if x['id'] is not None and existing.id != x['id']:
        errors.append(ClientUsersImportError(row=x['row'], message='ID не совпадает с существующим пользователем по email'))
        continue

      existing.first_name = x['firstName']
      existing.last_name = x['lastName']
      existing.role = x['role']
      existing.note = x['note']
      existing.phone = x['phone']
      existing.company_id = client_id

      pw = x['password']
      if not pw and generateRandomPasswordIfEmpty:
        pw = secrets.token_urlsafe(9)[:20]
      if pw:
        existing.temporary_password = pw
        existing.password_hash = hash_password(pw)
      updated += 1
      continue

    pw = x['password']
    if not pw and generateRandomPasswordIfEmpty:
      pw = secrets.token_urlsafe(9)[:20]
    if not pw:
      errors.append(ClientUsersImportError(row=x['row'], message='Пароль обязателен (или включите generateRandomPasswordIfEmpty)'))
      continue

    user = User(
      first_name=x['firstName'],
      last_name=x['lastName'],
      email=x['email'],
      phone=x['phone'],
      role=x['role'],
      note=x['note'],
      company_id=client_id,
      temporary_password=pw,
      password_hash=hash_password(pw),
    )
    db.add(user)
    created += 1

  if errors:
    await db.rollback()
    raise HTTPException(status_code=400, detail=ClientUsersImportResponse(created=0, updated=0, skipped=skipped, errors=errors).model_dump())

  await db.commit()
  return ClientUsersImportResponse(created=created, updated=updated, skipped=skipped, errors=None)


@router.get('/{client_id}/owners', response_model=ClientOwnersResponse, summary='Овнеры клиента')
async def list_client_owners (
  client_id: UUID = Path(..., description='ID клиента'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientOwnersResponse:
  _ensure_owner(current_user)
  await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)

  stmt = (
    select(OwnerCompanyAccess.owner_user_id, User.email, OwnerCompanyAccess.created_at)
    .join(User, User.id == OwnerCompanyAccess.owner_user_id)
    .where(OwnerCompanyAccess.company_id == client_id)
    .order_by(OwnerCompanyAccess.created_at.desc())
  )
  res = await db.execute(stmt)
  items: list[ClientOwnerItem] = []
  for user_id, email, created_at in res.all():
    items.append(ClientOwnerItem(userId=user_id, email=email, createdAt=created_at))
  return ClientOwnersResponse(clientId=client_id, items=items)


@router.post('/{client_id}/owners', response_model=ClientOwnersResponse, summary='Выдать доступ овнеру по email')
async def grant_client_owner (
  payload: GrantClientOwnerRequest,
  client_id: UUID = Path(..., description='ID клиента'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientOwnersResponse:
  _ensure_owner(current_user)
  await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)

  res = await db.execute(select(User).where(func.lower(User.email) == str(payload.email).strip().lower()))
  user = res.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=404, detail='Пользователь не найден')

  user.platform_role = 'owner'
  db.add(OwnerCompanyAccess(owner_user_id=user.id, company_id=client_id))
  try:
    await db.commit()
  except Exception:
    await db.rollback()

  return await list_client_owners(client_id=client_id, db=db, current_user=current_user)


@router.delete('/{client_id}/owners/{owner_user_id}', response_model=ClientOwnersResponse, summary='Отозвать доступ овнера')
async def revoke_client_owner (
  client_id: UUID = Path(..., description='ID клиента'),
  owner_user_id: UUID = Path(..., description='ID овнера'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ClientOwnersResponse:
  _ensure_owner(current_user)
  await _ensure_owner_access(db, owner_user_id=current_user.id, company_id=client_id)

  cnt_res = await db.execute(
    select(func.count()).select_from(OwnerCompanyAccess).where(OwnerCompanyAccess.company_id == client_id),
  )
  owners_count = int(cnt_res.scalar_one() or 0)
  if owners_count <= 1:
    raise HTTPException(status_code=400, detail='Нельзя удалить последнего овнера клиента')

  await db.execute(
    OwnerCompanyAccess.__table__.delete().where(  # type: ignore
      OwnerCompanyAccess.company_id == client_id,
      OwnerCompanyAccess.owner_user_id == owner_user_id,
    ),
  )
  await db.commit()

  return await list_client_owners(client_id=client_id, db=db, current_user=current_user)

