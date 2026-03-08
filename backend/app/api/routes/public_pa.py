from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Literal
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.checklist import Checklist
from app.models.checklist_item import ChecklistItem
from app.models.project import Project
from app.models.ref_brand import RefBrand
from app.models.ref_category import RefCategory
from app.models.ref_city import RefCity
from app.models.ref_product import RefProduct
from app.models.ref_region import RefRegion
from app.models.shop_chain import ShopChain
from app.models.shop_point import ShopPoint
from app.models.survey import Survey
from app.models.survey_invite import SurveyInvite
from app.models.survey_attempt import SurveyAttempt
from app.models.project_survey_auditor import ProjectSurveyAuditor
from app.models.survey_page import SurveyPage
from app.models.survey_question import SurveyQuestion
from app.models.survey_question_option import SurveyQuestionOption
from app.schemas.surveys import SurveyBuilderResponse, SurveyPageItem, SurveyQuestionItem, SurveyQuestionOptionItem


router = APIRouter()

class PublicPaSubmitRequest(BaseModel):
  answers: dict = Field(default_factory=dict)
  mode: Literal['continue', 'finish'] | None = None


async def _get_invite_or_404 (db: AsyncSession, token: UUID) -> SurveyInvite:
  res = await db.execute(select(SurveyInvite).where(SurveyInvite.token == token))
  invite = res.scalar_one_or_none()
  if invite is None or invite.revoked_at is not None:
    raise HTTPException(status_code=404, detail='Ссылка недействительна')
  return invite


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


@router.get('/pa/{token}')
async def get_public_pa (
  token: UUID,
  db: AsyncSession = Depends(get_db),
) -> dict:
  invite = await _get_invite_or_404(db, token)

  project_res = await db.execute(select(Project).where(Project.id == invite.project_id))
  project = project_res.scalar_one_or_none()
  if project is None:
    raise HTTPException(status_code=404, detail='Проект не найден')

  survey_res = await db.execute(select(Survey).where(Survey.id == invite.survey_id))
  survey = survey_res.scalar_one_or_none()
  if survey is None:
    raise HTTPException(status_code=404, detail='Анкета не найдена')

  builder = await _get_builder(db, invite.survey_id)
  return {
    'token': str(invite.token),
    'purpose': invite.purpose,
    'project': {'id': str(project.id), 'name': project.name},
    'survey': {'id': str(survey.id), 'title': survey.title, 'category': survey.category, 'templateKey': survey.template_key},
    'builder': builder.model_dump(),
  }


@router.get('/pa/{token}/options')
async def get_public_pa_options (
  token: UUID,
  source: str = Query(..., description='Ключ источника данных'),
  region: str | None = Query(default=None),
  city: str | None = Query(default=None),
  shopBrand: str | None = Query(default=None, description='ID сети/бренда магазина'),
  productGroup: str | None = Query(default=None, description='Категория/группа товаров (строкой)'),
  productBrand: str | None = Query(default=None, description='Бренд товара (строкой)'),
  db: AsyncSession = Depends(get_db),
) -> dict:
  invite = await _get_invite_or_404(db, token)

  if source == 'ref_regions':
    res = await db.execute(
      select(RefRegion)
      .join(ShopPoint, ShopPoint.region_code == RefRegion.code)
      .where(ShopPoint.project_id == invite.project_id, ShopPoint.region_code.is_not(None))
      .group_by(RefRegion.code, RefRegion.name)
      .order_by(RefRegion.code.asc()),
    )
    return {'items': [{'value': r.code, 'label': r.name} for r in res.scalars().all()]}

  if source == 'ref_cities':
    if not region:
      return {'items': []}
    stmt = select(RefCity).where(RefCity.region_code == region.strip()).order_by(RefCity.name.asc())
    res = await db.execute(stmt)
    return {'items': [{'value': c.name, 'label': c.name} for c in res.scalars().all()]}

  if source == 'project_shop_brands':
    stmt = (
      select(ShopChain)
      .join(ShopPoint, ShopPoint.chain_id == ShopChain.id)
      .where(ShopPoint.project_id == invite.project_id)
      .group_by(ShopChain.id)
      .order_by(ShopChain.name.asc())
    )
    if region:
      stmt = stmt.where(ShopPoint.region_code == region.strip())
    if city:
      stmt = stmt.where(func.lower(func.coalesce(ShopPoint.city_name, '')) == city.strip().lower())
    res = await db.execute(stmt)
    return {'items': [{'value': str(c.id), 'label': c.name} for c in res.scalars().all()]}

  if source == 'project_shop_addresses':
    if not shopBrand:
      return {'items': []}
    stmt = (
      select(ShopPoint)
      .where(ShopPoint.project_id == invite.project_id, ShopPoint.chain_id == UUID(shopBrand))
      .order_by(ShopPoint.created_at.desc())
    )
    if city:
      stmt = stmt.where(func.lower(func.coalesce(ShopPoint.city_name, '')) == city.strip().lower())
    res = await db.execute(stmt)
    out = []
    for p in res.scalars().all():
      label = p.address or p.concat or p.code
      out.append({'value': str(p.id), 'label': label})
    return {'items': out}

  if source == 'project_checklist_categories':
    res = await db.execute(
      select(RefCategory.name)
      .join(ChecklistItem, ChecklistItem.category_id == RefCategory.id)
      .join(Checklist, Checklist.id == ChecklistItem.checklist_id)
      .where(Checklist.project_id == invite.project_id)
      .group_by(RefCategory.name)
      .order_by(RefCategory.name.asc()),
    )
    return {'items': [{'value': name, 'label': name} for (name,) in res.all() if name]}

  if source == 'project_checklist_brands':
    if not productGroup:
      return {'items': []}
    res = await db.execute(
      select(RefBrand.name)
      .join(RefProduct, RefProduct.brand_id == RefBrand.id)
      .join(ChecklistItem, ChecklistItem.product_id == RefProduct.id)
      .join(Checklist, Checklist.id == ChecklistItem.checklist_id)
      .join(RefCategory, RefCategory.id == ChecklistItem.category_id)
      .where(Checklist.project_id == invite.project_id, RefCategory.name == productGroup.strip())
      .group_by(RefBrand.name)
      .order_by(RefBrand.name.asc()),
    )
    return {'items': [{'value': name, 'label': name} for (name,) in res.all() if name]}

  if source == 'project_checklist_products':
    if not productGroup or not productBrand:
      return {'items': []}
    res = await db.execute(
      select(RefProduct)
      .join(RefBrand, RefBrand.id == RefProduct.brand_id)
      .join(ChecklistItem, ChecklistItem.product_id == RefProduct.id)
      .join(Checklist, Checklist.id == ChecklistItem.checklist_id)
      .join(RefCategory, RefCategory.id == ChecklistItem.category_id)
      .where(
        Checklist.project_id == invite.project_id,
        RefCategory.name == productGroup.strip(),
        RefBrand.name == productBrand.strip(),
      )
      .group_by(RefProduct.id, RefBrand.id, RefCategory.id)
      .order_by(RefProduct.name.asc()),
    )
    items = []
    for p in res.scalars().all():
      parts = [p.name]
      if p.size:
        parts.append(str(p.size))
      if p.article:
        parts.append(f'арт. {p.article}')
      items.append({'value': str(p.id), 'label': ' · '.join(parts)})
    return {'items': items}

  raise HTTPException(status_code=400, detail='Неизвестный источник')


@router.post('/pa/{token}/submit', status_code=204)
async def submit_public_pa (
  token: UUID,
  payload: PublicPaSubmitRequest,
  db: AsyncSession = Depends(get_db),
) -> None:
  invite = await _get_invite_or_404(db, token)
  answers = payload.answers or {}
  stored_answers = {'mode': payload.mode, 'answers': answers}

  # если ссылка привязана к аудитору — переводим назначение в "в работе" при первой отправке
  if invite.auditor_id is not None:
    res = await db.execute(
      select(ProjectSurveyAuditor).where(
        ProjectSurveyAuditor.project_id == invite.project_id,
        ProjectSurveyAuditor.survey_id == invite.survey_id,
        ProjectSurveyAuditor.auditor_id == invite.auditor_id,
      ),
    )
    link = res.scalar_one_or_none()
    if link is not None and link.status != 'declined' and link.status != 'in_progress':
      link.status = 'in_progress'
      link.in_progress_at = link.in_progress_at or datetime.now(timezone.utc)

  attempt = SurveyAttempt(
    invite_token=invite.token,
    project_id=invite.project_id,
    survey_id=invite.survey_id,
    auditor_id=invite.auditor_id,
    answers=stored_answers,
    submitted_at=datetime.now(timezone.utc),
  )
  db.add(attempt)
  await db.commit()
  return None

