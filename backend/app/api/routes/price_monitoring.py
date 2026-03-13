from __future__ import annotations

from datetime import date, datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import String, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_page_permission
from app.db.session import get_db
from app.models.auditor import Auditor
from app.models.project import Project
from app.models.ref_product import RefProduct
from app.models.shop_chain import ShopChain
from app.models.shop_point import ShopPoint
from app.models.survey import Survey
from app.models.survey_attempt import SurveyAttempt
from app.models.survey_invite import SurveyInvite
from app.models.survey_page import SurveyPage
from app.models.survey_question import SurveyQuestion
from app.models.survey_question_option import SurveyQuestionOption
from app.models.user import User
from app.models.user_project_access import UserProjectAccess
from app.models.user_role import UserRole
from app.schemas.price_monitoring import (
  PriceMonitoringAttemptItem,
  PriceMonitoringAttemptDetailsResponse,
  PriceMonitoringAttemptsResponse,
  PriceMonitoringCountPoint,
  PriceMonitoringDailyCountItem,
  PriceMonitoringProjectItem,
  PriceMonitoringRespondentItem,
  PriceMonitoringStatsResponse,
  PriceMonitoringSurveyItem,
)
from app.schemas.surveys import SurveyBuilderResponse, SurveyPageItem, SurveyQuestionItem, SurveyQuestionOptionItem


router = APIRouter(dependencies=[Depends(require_page_permission('page.price-monitoring.view'))])

def _scope_filter_for_user (
  *,
  items: list[tuple[UUID, list]],
  region_expr,
) -> object | None:
  conds: list[object] = []
  for project_id, regions_raw in items:
    regions = [str(x).strip() for x in (regions_raw or []) if str(x).strip()]
    if '*' in regions:
      conds.append(SurveyAttempt.project_id == project_id)
      continue
    if not regions:
      continue
    conds.append((SurveyAttempt.project_id == project_id) & region_expr.in_(regions))

  if not conds:
    return None
  if len(conds) == 1:
    return conds[0]
  from sqlalchemy import or_  # local import to avoid large diff
  return or_(*conds)


async def _load_user_scopes (db: AsyncSession, *, company_id: UUID, user_id: UUID) -> list[tuple[UUID, list]]:
  res = await db.execute(
    select(UserProjectAccess.project_id, UserProjectAccess.region_codes)
    .join(Project, Project.id == UserProjectAccess.project_id)
    .where(UserProjectAccess.user_id == user_id, Project.company_id == company_id),
  )
  return [(pid, regions) for pid, regions in res.all()]


def _parse_iso_date (value: str | None) -> date | None:
  s = (value or '').strip()
  if not s:
    return None
  try:
    return date.fromisoformat(s)
  except Exception:
    return None


def _day_start (d: date) -> datetime:
  return datetime.combine(d, time(0, 0, 0), tzinfo=timezone.utc)


def _day_end (d: date) -> datetime:
  return datetime.combine(d, time(23, 59, 59), tzinfo=timezone.utc)


def _pick (obj: dict, *paths: list[str]) -> str | None:
  for path in paths:
    cur: object = obj
    ok = True
    for k in path:
      if not isinstance(cur, dict):
        ok = False
        break
      cur = cur.get(k)
    if not ok:
      continue
    if isinstance(cur, str) and cur.strip():
      return cur.strip()
  return None


def _pick_uuid (obj: dict, *paths: list[str]) -> UUID | None:
  s = _pick(obj, *paths)
  if not s:
    return None
  try:
    return UUID(s)
  except Exception:
    return None


def _norm_attempt_answers (raw: dict | None) -> tuple[str | None, dict]:
  if not isinstance(raw, dict):
    return (None, {})

  mode = raw.get('mode') if isinstance(raw.get('mode'), str) else None
  answers = raw.get('answers')
  if isinstance(answers, dict):
    return (mode, answers)

  # legacy: answers лежат на верхнем уровне
  return (mode, raw)


def _ensure_company_access (project: Project | None, survey: Survey | None) -> None:
  if project is None:
    raise HTTPException(status_code=404, detail='Проект не найден')
  if survey is None:
    raise HTTPException(status_code=404, detail='Анкета не найдена')


async def _get_builder (db: AsyncSession, survey_id: UUID) -> SurveyBuilderResponse:
  pages_res = await db.execute(
    select(SurveyPage).where(SurveyPage.survey_id == survey_id).order_by(SurveyPage.sort_order.asc(), SurveyPage.title.asc()),
  )
  pages = pages_res.scalars().all()

  questions_res = await db.execute(
    select(SurveyQuestion).where(SurveyQuestion.survey_id == survey_id).order_by(SurveyQuestion.page_id.asc(), SurveyQuestion.sort_order.asc()),
  )
  questions = questions_res.scalars().all()

  qids = [q.id for q in questions]
  options_by_q: dict[UUID, list[SurveyQuestionOptionItem]] = {}
  if qids:
    opt_res = await db.execute(
      select(SurveyQuestionOption)
      .where(SurveyQuestionOption.question_id.in_(qids))
      .order_by(SurveyQuestionOption.question_id.asc(), SurveyQuestionOption.sort_order.asc()),
    )
    for opt in opt_res.scalars().all():
      options_by_q.setdefault(opt.question_id, []).append(
        SurveyQuestionOptionItem(id=opt.id, label=opt.label, value=opt.value, sortOrder=int(opt.sort_order or 0)),
      )

  questions_by_page: dict[UUID, list[SurveyQuestionItem]] = {}
  for q in questions:
    questions_by_page.setdefault(q.page_id, []).append(
      SurveyQuestionItem(
        id=q.id,
        type=q.type,
        title=q.title,
        required=bool(q.required),
        sortOrder=int(q.sort_order or 0),
        config=q.config,
        options=options_by_q.get(q.id, []),
      ),
    )

  pages_out: list[SurveyPageItem] = []
  for p in pages:
    pages_out.append(
      SurveyPageItem(
        id=p.id,
        title=p.title,
        sortOrder=int(p.sort_order or 0),
        questions=questions_by_page.get(p.id, []),
      ),
    )

  return SurveyBuilderResponse(surveyId=survey_id, pages=pages_out)


@router.get(
  '/stats',
  response_model=PriceMonitoringStatsResponse,
  summary='Статистика по ценовому мониторингу',
)
async def get_price_monitoring_stats (
  projectId: UUID | None = Query(default=None),
  surveyId: UUID | None = Query(default=None),
  dateFrom: str | None = Query(default=None, description='YYYY-MM-DD'),
  dateTo: str | None = Query(default=None, description='YYYY-MM-DD'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> PriceMonitoringStatsResponse:
  company_id = getattr(current_user, 'active_company_id', current_user.company_id)
  d_from = _parse_iso_date(dateFrom)
  d_to = _parse_iso_date(dateTo)

  filters = [
    Project.company_id == company_id,
    Survey.company_id == company_id,
    Survey.category == 'price_monitoring',
  ]
  if projectId is not None:
    filters.append(SurveyAttempt.project_id == projectId)
  if surveyId is not None:
    filters.append(SurveyAttempt.survey_id == surveyId)
  if d_from is not None:
    filters.append(SurveyAttempt.submitted_at.is_not(None))
    filters.append(SurveyAttempt.submitted_at >= _day_start(d_from))
  if d_to is not None:
    filters.append(SurveyAttempt.submitted_at.is_not(None))
    filters.append(SurveyAttempt.submitted_at <= _day_end(d_to))

  region_expr = func.coalesce(
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'region'),
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'region'),
  )

  scope_filter = None
  if current_user.role in (UserRole.controller, UserRole.coordinator):
    scopes = await _load_user_scopes(db, company_id=company_id, user_id=current_user.id)
    scope_filter = _scope_filter_for_user(items=scopes, region_expr=region_expr)
    if scope_filter is None:
      return PriceMonitoringStatsResponse(totalAttempts=0, uniqueRespondents=0, uniqueShops=0, byDay=[], topRegions=[], topCities=[], topShopBrands=[])
    filters.append(scope_filter)

  total_res = await db.execute(
    select(func.count())
    .select_from(SurveyAttempt)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .where(*filters),
  )
  total = int(total_res.scalar_one() or 0)

  # distinct respondents key (auditor_id OR email|phone)
  email_expr = func.coalesce(
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'auditorEmail'),
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'auditorEmail'),
  )
  phone_expr = func.coalesce(
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'auditorPhone'),
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'auditorPhone'),
  )
  respondent_key = func.coalesce(
    func.cast(SurveyAttempt.auditor_id, String),
    func.concat(func.coalesce(email_expr, ''), '|', func.coalesce(phone_expr, '')),
  )
  uniq_resp_res = await db.execute(
    select(func.count(func.distinct(respondent_key)))
    .select_from(SurveyAttempt)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .where(*filters),
  )
  unique_respondents = int(uniq_resp_res.scalar_one() or 0)

  shop_addr_expr = func.coalesce(
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'shopAddress'),
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'shopAddress'),
  )
  uniq_shop_res = await db.execute(
    select(func.count(func.distinct(shop_addr_expr)))
    .select_from(SurveyAttempt)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .where(*filters),
  )
  unique_shops = int(uniq_shop_res.scalar_one() or 0)

  # by day (last 30)
  day_expr = func.date_trunc('day', SurveyAttempt.submitted_at)
  by_day_stmt = (
    select(day_expr.label('day'), func.count().label('cnt'))
    .select_from(SurveyAttempt)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .where(
      Project.company_id == company_id,
      Survey.company_id == company_id,
      Survey.category == 'price_monitoring',
      SurveyAttempt.submitted_at.is_not(None),
    )
    .group_by(day_expr)
    .order_by(day_expr.desc())
    .limit(30)
  )
  if projectId is not None:
    by_day_stmt = by_day_stmt.where(SurveyAttempt.project_id == projectId)
  if surveyId is not None:
    by_day_stmt = by_day_stmt.where(SurveyAttempt.survey_id == surveyId)
  if d_from is not None:
    by_day_stmt = by_day_stmt.where(SurveyAttempt.submitted_at >= _day_start(d_from))
  if d_to is not None:
    by_day_stmt = by_day_stmt.where(SurveyAttempt.submitted_at <= _day_end(d_to))
  if scope_filter is not None:
    by_day_stmt = by_day_stmt.where(scope_filter)

  by_day_res = await db.execute(by_day_stmt)
  by_day = []
  for day_dt, cnt in by_day_res.all():
    if day_dt is None:
      continue
    by_day.append(PriceMonitoringDailyCountItem(day=day_dt.date(), count=int(cnt or 0)))
  by_day.reverse()

  city_expr = func.coalesce(
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'city'),
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'city'),
  )

  top_regions_stmt = (
    select(region_expr.label('k'), func.count().label('cnt'))
    .select_from(SurveyAttempt)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .where(
      Project.company_id == company_id,
      Survey.company_id == company_id,
      Survey.category == 'price_monitoring',
      SurveyAttempt.submitted_at.is_not(None),
      region_expr.is_not(None),
      region_expr != '',
    )
    .group_by(region_expr)
    .order_by(func.count().desc())
    .limit(10)
  )
  if projectId is not None:
    top_regions_stmt = top_regions_stmt.where(SurveyAttempt.project_id == projectId)
  if surveyId is not None:
    top_regions_stmt = top_regions_stmt.where(SurveyAttempt.survey_id == surveyId)
  if d_from is not None:
    top_regions_stmt = top_regions_stmt.where(SurveyAttempt.submitted_at >= _day_start(d_from))
  if d_to is not None:
    top_regions_stmt = top_regions_stmt.where(SurveyAttempt.submitted_at <= _day_end(d_to))
  if scope_filter is not None:
    top_regions_stmt = top_regions_stmt.where(scope_filter)
  top_regions_res = await db.execute(top_regions_stmt)
  top_regions = [PriceMonitoringCountPoint(label=str(k), count=int(cnt or 0)) for k, cnt in top_regions_res.all() if k]

  top_cities_stmt = (
    select(city_expr.label('k'), func.count().label('cnt'))
    .select_from(SurveyAttempt)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .where(
      Project.company_id == company_id,
      Survey.company_id == company_id,
      Survey.category == 'price_monitoring',
      SurveyAttempt.submitted_at.is_not(None),
      city_expr.is_not(None),
      city_expr != '',
    )
    .group_by(city_expr)
    .order_by(func.count().desc())
    .limit(10)
  )
  if projectId is not None:
    top_cities_stmt = top_cities_stmt.where(SurveyAttempt.project_id == projectId)
  if surveyId is not None:
    top_cities_stmt = top_cities_stmt.where(SurveyAttempt.survey_id == surveyId)
  if d_from is not None:
    top_cities_stmt = top_cities_stmt.where(SurveyAttempt.submitted_at >= _day_start(d_from))
  if d_to is not None:
    top_cities_stmt = top_cities_stmt.where(SurveyAttempt.submitted_at <= _day_end(d_to))
  if scope_filter is not None:
    top_cities_stmt = top_cities_stmt.where(scope_filter)
  top_cities_res = await db.execute(top_cities_stmt)
  top_cities = [PriceMonitoringCountPoint(label=str(k), count=int(cnt or 0)) for k, cnt in top_cities_res.all() if k]

  brand_id_expr = func.coalesce(
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'shopBrand'),
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'shopBrand'),
  )
  top_brands_stmt = (
    select(brand_id_expr.label('k'), func.count().label('cnt'))
    .select_from(SurveyAttempt)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .where(
      Project.company_id == company_id,
      Survey.company_id == company_id,
      Survey.category == 'price_monitoring',
      SurveyAttempt.submitted_at.is_not(None),
      brand_id_expr.is_not(None),
      brand_id_expr != '',
    )
    .group_by(brand_id_expr)
    .order_by(func.count().desc())
    .limit(10)
  )
  if projectId is not None:
    top_brands_stmt = top_brands_stmt.where(SurveyAttempt.project_id == projectId)
  if surveyId is not None:
    top_brands_stmt = top_brands_stmt.where(SurveyAttempt.survey_id == surveyId)
  if d_from is not None:
    top_brands_stmt = top_brands_stmt.where(SurveyAttempt.submitted_at >= _day_start(d_from))
  if d_to is not None:
    top_brands_stmt = top_brands_stmt.where(SurveyAttempt.submitted_at <= _day_end(d_to))
  if scope_filter is not None:
    top_brands_stmt = top_brands_stmt.where(scope_filter)
  top_brands_res = await db.execute(top_brands_stmt)
  brand_ids = [k for k, _ in top_brands_res.all() if k]

  brand_name_by_id: dict[str, str] = {}
  if brand_ids:
    parsed = []
    for x in brand_ids:
      try:
        parsed.append(UUID(str(x)))
      except Exception:
        pass
    if parsed:
      bres = await db.execute(select(ShopChain).where(ShopChain.id.in_(parsed)))
      for b in bres.scalars().all():
        brand_name_by_id[str(b.id)] = b.name

  top_shop_brands_res = await db.execute(top_brands_stmt)
  top_shop_brands = []
  for k, cnt in top_shop_brands_res.all():
    if not k:
      continue
    kid = str(k)
    top_shop_brands.append(PriceMonitoringCountPoint(label=brand_name_by_id.get(kid, kid), count=int(cnt or 0)))

  return PriceMonitoringStatsResponse(
    totalAttempts=total,
    uniqueRespondents=unique_respondents,
    uniqueShops=unique_shops,
    byDay=by_day,
    topRegions=top_regions,
    topCities=top_cities,
    topShopBrands=top_shop_brands,
  )


@router.get(
  '/attempts',
  response_model=PriceMonitoringAttemptsResponse,
  summary='Список прохождений ценового мониторинга',
)
async def list_price_monitoring_attempts (
  projectId: UUID | None = Query(default=None),
  surveyId: UUID | None = Query(default=None),
  q: str | None = Query(default=None, description='Поиск по респонденту/контактам'),
  dateFrom: str | None = Query(default=None, description='YYYY-MM-DD'),
  dateTo: str | None = Query(default=None, description='YYYY-MM-DD'),
  limit: int = Query(default=50, ge=1, le=200),
  offset: int = Query(default=0, ge=0),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> PriceMonitoringAttemptsResponse:
  company_id = getattr(current_user, 'active_company_id', current_user.company_id)
  d_from = _parse_iso_date(dateFrom)
  d_to = _parse_iso_date(dateTo)

  region_expr = func.coalesce(
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'region'),
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'region'),
  )

  stmt = (
    select(SurveyAttempt, Project, Survey, SurveyInvite, Auditor)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .outerjoin(SurveyInvite, SurveyInvite.token == SurveyAttempt.invite_token)
    .outerjoin(Auditor, Auditor.id == SurveyAttempt.auditor_id)
    .where(
      Project.company_id == company_id,
      Survey.company_id == company_id,
      Survey.category == 'price_monitoring',
    )
    .order_by(SurveyAttempt.submitted_at.desc().nullslast(), SurveyAttempt.created_at.desc())
  )

  if projectId is not None:
    stmt = stmt.where(SurveyAttempt.project_id == projectId)
  if surveyId is not None:
    stmt = stmt.where(SurveyAttempt.survey_id == surveyId)
  if d_from is not None:
    stmt = stmt.where(SurveyAttempt.submitted_at.is_not(None), SurveyAttempt.submitted_at >= _day_start(d_from))
  if d_to is not None:
    stmt = stmt.where(SurveyAttempt.submitted_at.is_not(None), SurveyAttempt.submitted_at <= _day_end(d_to))

  if current_user.role in (UserRole.controller, UserRole.coordinator):
    scopes = await _load_user_scopes(db, company_id=company_id, user_id=current_user.id)
    scope_filter = _scope_filter_for_user(items=scopes, region_expr=region_expr)
    if scope_filter is None:
      return PriceMonitoringAttemptsResponse(items=[], total=0, limit=limit, offset=offset)
    stmt = stmt.where(scope_filter)

  if q and q.strip():
    like = f'%{q.strip()}%'
    name_expr = func.coalesce(
      func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'auditorName'),
      func.jsonb_extract_path_text(SurveyAttempt.answers, 'auditorName'),
    )
    email_expr = func.coalesce(
      func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'auditorEmail'),
      func.jsonb_extract_path_text(SurveyAttempt.answers, 'auditorEmail'),
    )
    phone_expr = func.coalesce(
      func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'auditorPhone'),
      func.jsonb_extract_path_text(SurveyAttempt.answers, 'auditorPhone'),
    )
    stmt = stmt.where(
      func.coalesce(Auditor.last_name, '').ilike(like)
      | func.coalesce(Auditor.first_name, '').ilike(like)
      | func.coalesce(Auditor.middle_name, '').ilike(like)
      | func.coalesce(Auditor.email, '').ilike(like)
      | func.coalesce(Auditor.phone, '').ilike(like)
      | func.coalesce(name_expr, '').ilike(like)
      | func.coalesce(email_expr, '').ilike(like)
      | func.coalesce(phone_expr, '').ilike(like)
    )

  count_stmt = select(func.count()).select_from(stmt.subquery())
  total_res = await db.execute(count_stmt)
  total = int(total_res.scalar_one() or 0)

  res = await db.execute(stmt.limit(limit).offset(offset))
  rows = res.all()

  # collect refs for mapping (page size <= 200)
  brand_ids: set[UUID] = set()
  address_ids: set[UUID] = set()
  product_ids: set[UUID] = set()

  normalized: list[tuple[SurveyAttempt, Project, Survey, SurveyInvite | None, Auditor | None, str | None, dict]] = []
  for attempt, project, survey, invite, auditor in rows:
    mode, answers = _norm_attempt_answers(attempt.answers)
    normalized.append((attempt, project, survey, invite, auditor, mode, answers))
    brand_id = _pick_uuid(answers, ['screening', 'shopBrand'], ['shopBrand'])
    addr_id = _pick_uuid(answers, ['screening', 'shopAddress'], ['shopAddress'])
    prod_id = _pick_uuid(answers, ['product', 'productSku'], ['productSku'])
    if brand_id:
      brand_ids.add(brand_id)
    if addr_id:
      address_ids.add(addr_id)
    if prod_id:
      product_ids.add(prod_id)

  brand_by_id: dict[UUID, ShopChain] = {}
  if brand_ids:
    bres = await db.execute(select(ShopChain).where(ShopChain.id.in_(list(brand_ids))))
    for b in bres.scalars().all():
      brand_by_id[b.id] = b

  point_by_id: dict[UUID, ShopPoint] = {}
  if address_ids:
    pres = await db.execute(select(ShopPoint).where(ShopPoint.id.in_(list(address_ids))))
    for p in pres.scalars().all():
      point_by_id[p.id] = p

  product_by_id: dict[UUID, RefProduct] = {}
  if product_ids:
    rres = await db.execute(select(RefProduct).where(RefProduct.id.in_(list(product_ids))))
    for p in rres.scalars().all():
      product_by_id[p.id] = p

  items: list[PriceMonitoringAttemptItem] = []
  for attempt, project, survey, invite, auditor, mode, answers in normalized:
    respondent_name = None
    respondent_phone = None
    respondent_email = None
    if auditor is not None:
      respondent_name = ' '.join([x for x in [auditor.last_name, auditor.first_name, auditor.middle_name] if x])
      respondent_phone = auditor.phone
      respondent_email = auditor.email
    else:
      respondent_name = _pick(answers, ['screening', 'auditorName'], ['auditorName'])
      respondent_phone = _pick(answers, ['screening', 'auditorPhone'], ['auditorPhone'])
      respondent_email = _pick(answers, ['screening', 'auditorEmail'], ['auditorEmail'])

    region_code = _pick(answers, ['screening', 'region'], ['region'])
    city = _pick(answers, ['screening', 'city'], ['city'])
    shop_brand_id = _pick_uuid(answers, ['screening', 'shopBrand'], ['shopBrand'])
    shop_address_id = _pick_uuid(answers, ['screening', 'shopAddress'], ['shopAddress'])

    shop_brand_name = brand_by_id.get(shop_brand_id).name if shop_brand_id in brand_by_id else None
    shop_address_label = None
    if shop_address_id and shop_address_id in point_by_id:
      p = point_by_id[shop_address_id]
      shop_address_label = p.address or p.concat or p.code

    product_group = _pick(answers, ['product', 'productGroup'], ['productGroup'])
    product_brand = _pick(answers, ['product', 'productBrand'], ['productBrand'])
    product_sku_id = _pick_uuid(answers, ['product', 'productSku'], ['productSku'])
    product_sku_label = None
    if product_sku_id and product_sku_id in product_by_id:
      pr = product_by_id[product_sku_id]
      parts = [pr.name]
      if pr.size:
        parts.append(str(pr.size))
      if pr.article:
        parts.append(f'арт. {pr.article}')
      product_sku_label = ' · '.join(parts)

    _ensure_company_access(project, survey)

    items.append(
      PriceMonitoringAttemptItem(
        id=attempt.id,
        submittedAt=attempt.submitted_at,
        createdAt=attempt.created_at,
        mode=mode,
        project=PriceMonitoringProjectItem(id=project.id, name=project.name),
        survey=PriceMonitoringSurveyItem(id=survey.id, title=survey.title),
        purpose=(invite.purpose if invite is not None else None),
        respondent=PriceMonitoringRespondentItem(
          auditorId=attempt.auditor_id,
          name=respondent_name,
          phone=respondent_phone,
          email=respondent_email,
        ),
        regionCode=region_code,
        city=city,
        shopBrandId=shop_brand_id,
        shopBrandName=shop_brand_name,
        shopAddressId=shop_address_id,
        shopAddressLabel=shop_address_label,
        productGroup=product_group,
        productBrand=product_brand,
        productSkuId=product_sku_id,
        productSkuLabel=product_sku_label,
      ),
    )

  return PriceMonitoringAttemptsResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
  '/attempts/{attempt_id}',
  response_model=PriceMonitoringAttemptDetailsResponse,
  summary='Детали прохождения ценового мониторинга',
)
async def get_price_monitoring_attempt_details (
  attempt_id: UUID = Path(..., description='ID прохождения'),
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> PriceMonitoringAttemptDetailsResponse:
  company_id = getattr(current_user, 'active_company_id', current_user.company_id)

  region_expr = func.coalesce(
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'answers', 'screening', 'region'),
    func.jsonb_extract_path_text(SurveyAttempt.answers, 'region'),
  )

  extra_filters: list[object] = []
  if current_user.role in (UserRole.controller, UserRole.coordinator):
    scopes = await _load_user_scopes(db, company_id=company_id, user_id=current_user.id)
    scope_filter = _scope_filter_for_user(items=scopes, region_expr=region_expr)
    if scope_filter is None:
      raise HTTPException(status_code=404, detail='Прохождение не найдено')
    extra_filters.append(scope_filter)

  res = await db.execute(
    select(SurveyAttempt, Project, Survey, SurveyInvite, Auditor)
    .join(Project, Project.id == SurveyAttempt.project_id)
    .join(Survey, Survey.id == SurveyAttempt.survey_id)
    .outerjoin(SurveyInvite, SurveyInvite.token == SurveyAttempt.invite_token)
    .outerjoin(Auditor, Auditor.id == SurveyAttempt.auditor_id)
    .where(
      SurveyAttempt.id == attempt_id,
      Project.company_id == company_id,
      Survey.company_id == company_id,
      Survey.category == 'price_monitoring',
      *extra_filters,
    ),
  )
  row = res.first()
  if row is None:
    raise HTTPException(status_code=404, detail='Прохождение не найдено')

  attempt, project, survey, invite, auditor = row
  mode, answers = _norm_attempt_answers(attempt.answers)

  brand_id = _pick_uuid(answers, ['screening', 'shopBrand'], ['shopBrand'])
  addr_id = _pick_uuid(answers, ['screening', 'shopAddress'], ['shopAddress'])
  prod_id = _pick_uuid(answers, ['product', 'productSku'], ['productSku'])

  brand = None
  if brand_id:
    bres = await db.execute(select(ShopChain).where(ShopChain.id == brand_id))
    brand = bres.scalar_one_or_none()

  point = None
  if addr_id:
    pres = await db.execute(select(ShopPoint).where(ShopPoint.id == addr_id))
    point = pres.scalar_one_or_none()

  product = None
  if prod_id:
    rres = await db.execute(select(RefProduct).where(RefProduct.id == prod_id))
    product = rres.scalar_one_or_none()

  respondent_name = None
  respondent_phone = None
  respondent_email = None
  if auditor is not None:
    respondent_name = ' '.join([x for x in [auditor.last_name, auditor.first_name, auditor.middle_name] if x])
    respondent_phone = auditor.phone
    respondent_email = auditor.email
  else:
    respondent_name = _pick(answers, ['screening', 'auditorName'], ['auditorName'])
    respondent_phone = _pick(answers, ['screening', 'auditorPhone'], ['auditorPhone'])
    respondent_email = _pick(answers, ['screening', 'auditorEmail'], ['auditorEmail'])

  region_code = _pick(answers, ['screening', 'region'], ['region'])
  city = _pick(answers, ['screening', 'city'], ['city'])

  shop_brand_name = brand.name if brand is not None else None
  shop_address_label = None
  if point is not None:
    shop_address_label = point.address or point.concat or point.code

  product_group = _pick(answers, ['product', 'productGroup'], ['productGroup'])
  product_brand = _pick(answers, ['product', 'productBrand'], ['productBrand'])
  product_sku_label = None
  if product is not None:
    parts = [product.name]
    if product.size:
      parts.append(str(product.size))
    if product.article:
      parts.append(f'арт. {product.article}')
    product_sku_label = ' · '.join(parts)

  attempt_item = PriceMonitoringAttemptItem(
    id=attempt.id,
    submittedAt=attempt.submitted_at,
    createdAt=attempt.created_at,
    mode=mode,
    project=PriceMonitoringProjectItem(id=project.id, name=project.name),
    survey=PriceMonitoringSurveyItem(id=survey.id, title=survey.title),
    purpose=(invite.purpose if invite is not None else None),
    respondent=PriceMonitoringRespondentItem(
      auditorId=attempt.auditor_id,
      name=respondent_name,
      phone=respondent_phone,
      email=respondent_email,
    ),
    regionCode=region_code,
    city=city,
    shopBrandId=brand_id,
    shopBrandName=shop_brand_name,
    shopAddressId=addr_id,
    shopAddressLabel=shop_address_label,
    productGroup=product_group,
    productBrand=product_brand,
    productSkuId=prod_id,
    productSkuLabel=product_sku_label,
  )

  builder = await _get_builder(db, survey.id)
  stored = attempt.answers if isinstance(attempt.answers, dict) else {}
  return PriceMonitoringAttemptDetailsResponse(attempt=attempt_item, builder=builder, storedAnswers=stored)

