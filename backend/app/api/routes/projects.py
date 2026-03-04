from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.ref_city import RefCity
from app.models.ref_region import RefRegion
from app.models.user import User
from app.schemas.projects import (
  AddressbookCloneRequest,
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectItem,
  ProjectManagerPublic,
  ProjectsResponse,
  RefCitiesResponse,
  RefCityItem,
  RefRegionsResponse,
  RefRegionItem,
)


router = APIRouter()


def to_project_item (project: Project) -> ProjectItem:
  manager = project.manager
  manager_public = None
  if manager is not None:
    manager_public = ProjectManagerPublic(
      id=manager.id,
      firstName=manager.first_name,
      lastName=manager.last_name,
      email=manager.email,
    )

  return ProjectItem(
    id=project.id,
    name=project.name,
    comment=project.comment,
    startDate=project.start_date,
    endDate=project.end_date,
    manager=manager_public,
    createdAt=project.created_at,
  )


@router.get(
  '',
  response_model=ProjectsResponse,
  summary='Список проектов',
  description='Возвращает проекты текущей компании. Поддерживает поиск по названию.',
)
async def list_projects (
  q: str | None = Query(default=None, description='Поиск по названию проекта'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> ProjectsResponse:
  stmt = (
    select(Project)
    .options(selectinload(Project.manager))
    .where(Project.company_id == current_user.company_id)
    .order_by(Project.created_at.desc())
  )
  if q:
    like = f'%{q.strip()}%'
    stmt = stmt.where(Project.name.ilike(like))

  res = await db.execute(stmt)
  items = res.scalars().all()
  return ProjectsResponse(items=[to_project_item(p) for p in items])


@router.post(
  '',
  response_model=CreateProjectResponse,
  status_code=status.HTTP_201_CREATED,
  summary='Создать проект',
  description='Создаёт проект в рамках компании текущего пользователя.',
)
async def create_project (
  payload: CreateProjectRequest,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> CreateProjectResponse:
  if payload.startDate > payload.endDate:
    raise HTTPException(status_code=400, detail='Дата окончания должна быть не раньше даты начала')

  manager_res = await db.execute(
    select(User).where(
      User.id == payload.managerId,
      User.company_id == current_user.company_id,
    ),
  )
  manager = manager_res.scalar_one_or_none()
  if manager is None:
    raise HTTPException(status_code=400, detail='Выбранный менеджер не найден в вашей компании')

  project = Project(
    company_id=current_user.company_id,
    manager_user_id=payload.managerId,
    name=payload.name.strip(),
    comment=payload.comment.strip() if payload.comment else None,
    start_date=payload.startDate,
    end_date=payload.endDate,
  )
  db.add(project)
  await db.commit()

  res = await db.execute(
    select(Project)
    .options(selectinload(Project.manager))
    .where(Project.id == project.id, Project.company_id == current_user.company_id),
  )
  project = res.scalar_one()
  return CreateProjectResponse(project=to_project_item(project))


@router.post(
  '/{project_id}/addressbook/upload',
  status_code=status.HTTP_204_NO_CONTENT,
  summary='Загрузить адресный справочник (файл)',
  description='Принимает Excel/CSV файл для будущей обработки и наполнения адресного справочника проекта.',
)
async def upload_addressbook (
  project_id: UUID = Path(..., description='ID проекта'),
  file: UploadFile = File(...),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> None:
  res = await db.execute(select(Project.id).where(Project.id == project_id, Project.company_id == current_user.company_id))
  if res.scalar_one_or_none() is None:
    raise HTTPException(status_code=404, detail='Проект не найден')

  await file.read()
  return None


@router.post(
  '/{project_id}/addressbook/clone',
  status_code=status.HTTP_204_NO_CONTENT,
  summary='Скопировать адресный справочник из проекта',
  description='Прототип. Проверяет доступ к проектам и готовит дальнейшее копирование.',
)
async def clone_addressbook (
  payload: AddressbookCloneRequest,
  project_id: UUID = Path(..., description='ID проекта'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> None:
  res = await db.execute(select(Project).where(Project.id == project_id, Project.company_id == current_user.company_id))
  target = res.scalar_one_or_none()
  if target is None:
    raise HTTPException(status_code=404, detail='Проект не найден')

  src_res = await db.execute(
    select(Project).where(Project.id == payload.sourceProjectId, Project.company_id == current_user.company_id),
  )
  source = src_res.scalar_one_or_none()
  if source is None:
    raise HTTPException(status_code=400, detail='Проект-источник не найден')

  return None


@router.get(
  '/refs/regions',
  response_model=RefRegionsResponse,
  summary='Справочник регионов',
)
async def list_regions (
  db: AsyncSession = Depends(get_db),
) -> RefRegionsResponse:
  res = await db.execute(select(RefRegion).order_by(RefRegion.code.asc()))
  items = res.scalars().all()
  return RefRegionsResponse(items=[RefRegionItem(code=r.code, name=r.name) for r in items])


@router.get(
  '/refs/cities',
  response_model=RefCitiesResponse,
  summary='Справочник городов',
)
async def list_cities (
  regionCode: str | None = Query(default=None, description='Фильтр по коду региона'),
  db: AsyncSession = Depends(get_db),
) -> RefCitiesResponse:
  stmt = select(RefCity)
  if regionCode:
    stmt = stmt.where(RefCity.region_code == regionCode.strip())
  stmt = stmt.order_by(RefCity.name.asc())

  res = await db.execute(stmt)
  items = res.scalars().all()
  return RefCitiesResponse(items=[RefCityItem(id=c.id, name=c.name, regionCode=c.region_code) for c in items])

