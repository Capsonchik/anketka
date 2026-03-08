from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.project_survey import ProjectSurvey
from app.models.project import Project
from app.models.survey import Survey
from app.models.survey_page import SurveyPage
from app.models.survey_question import SurveyQuestion
from app.models.survey_question_option import SurveyQuestionOption
from app.models.user import User
from app.schemas.surveys import (
  SurveyApplyTemplateRequest,
  SurveyBuilderResponse,
  SurveyCreateRequest,
  SurveyCreateResponse,
  SurveyItem,
  SurveyPageItem,
  SurveyQuestionItem,
  SurveyQuestionOptionItem,
  SurveyQuestionResponse,
  SurveyQuestionUpdateRequest,
  SurveyResponse,
  SurveysResponse,
  SurveyUpdateRequest,
  SurveyUpdateResponse,
  SurveyAttachedProjectItem,
  SurveyAttachedProjectsResponse,
)


router = APIRouter()


def to_survey_item (s: Survey) -> SurveyItem:
  return SurveyItem(id=s.id, title=s.title, category=s.category, templateKey=s.template_key, createdAt=s.created_at)


async def _get_survey_or_404 (db: AsyncSession, current_user: User, survey_id: UUID) -> Survey:
  res = await db.execute(select(Survey).where(Survey.id == survey_id, Survey.company_id == current_user.company_id))
  survey = res.scalar_one_or_none()
  if survey is None:
    raise HTTPException(status_code=404, detail='Анкета не найдена')
  return survey


def _template_full (survey_id: UUID) -> tuple[list[SurveyPage], list[SurveyQuestion], list[SurveyQuestionOption]]:
  pages: list[SurveyPage] = [
    SurveyPage(survey_id=survey_id, title='Скрининг', sort_order=1),
    SurveyPage(survey_id=survey_id, title='Анкета', sort_order=2),
  ]

  # page_id заполним после flush, поэтому создаём вопросы отдельно в apply-template
  return (pages, [], [])


def _template_quick (survey_id: UUID) -> tuple[list[SurveyPage], list[SurveyQuestion], list[SurveyQuestionOption]]:
  pages: list[SurveyPage] = [
    SurveyPage(survey_id=survey_id, title='Магазин', sort_order=1),
    SurveyPage(survey_id=survey_id, title='Мониторинг цен', sort_order=2),
  ]
  return (pages, [], [])


@router.get(
  '',
  response_model=SurveysResponse,
  summary='Список анкет',
  description='Возвращает анкеты текущей компании.',
)
async def list_surveys (
  q: str | None = None,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> SurveysResponse:
  stmt = select(Survey).where(Survey.company_id == current_user.company_id).order_by(Survey.created_at.desc())
  if q:
    like = f'%{q.strip()}%'
    stmt = stmt.where(Survey.title.ilike(like))
  res = await db.execute(stmt)
  return SurveysResponse(items=[to_survey_item(x) for x in res.scalars().all()])


@router.get(
  '/{survey_id}',
  response_model=SurveyResponse,
  summary='Детали анкеты',
  description='Возвращает анкету текущей компании по id.',
)
async def get_survey (
  survey_id: UUID,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> SurveyResponse:
  survey = await _get_survey_or_404(db, current_user, survey_id)
  return SurveyResponse(survey=to_survey_item(survey))


@router.get(
  '/{survey_id}/builder',
  response_model=SurveyBuilderResponse,
  summary='Структура анкеты (конструктор)',
  description='Возвращает страницы и вопросы анкеты для конструктора.',
)
async def get_survey_builder (
  survey_id: UUID,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> SurveyBuilderResponse:
  await _get_survey_or_404(db, current_user, survey_id)

  pages_res = await db.execute(
    select(SurveyPage).where(SurveyPage.survey_id == survey_id).order_by(SurveyPage.sort_order.asc(), SurveyPage.title.asc()),
  )
  pages = pages_res.scalars().all()

  questions_res = await db.execute(
    select(SurveyQuestion)
    .where(SurveyQuestion.survey_id == survey_id)
    .order_by(SurveyQuestion.page_id.asc(), SurveyQuestion.sort_order.asc()),
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
  '/{survey_id}/projects',
  response_model=SurveyAttachedProjectsResponse,
  summary='Проекты, к которым прикреплена анкета',
  description='Возвращает список проектов текущей компании, где анкета прикреплена.',
)
async def list_survey_projects (
  survey_id: UUID,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> SurveyAttachedProjectsResponse:
  await _get_survey_or_404(db, current_user, survey_id)

  res = await db.execute(
    select(Project, ProjectSurvey.attached_at)
    .join(ProjectSurvey, ProjectSurvey.project_id == Project.id)
    .where(ProjectSurvey.survey_id == survey_id, Project.company_id == current_user.company_id)
    .order_by(ProjectSurvey.attached_at.desc()),
  )

  items: list[SurveyAttachedProjectItem] = []
  for project, attached_at in res.all():
    items.append(SurveyAttachedProjectItem(id=project.id, name=project.name, attachedAt=attached_at))

  return SurveyAttachedProjectsResponse(items=items)

def _to_question_item (q: SurveyQuestion, options: list[SurveyQuestionOptionItem]) -> SurveyQuestionItem:
  return SurveyQuestionItem(
    id=q.id,
    type=q.type,
    title=q.title,
    required=bool(q.required),
    sortOrder=int(q.sort_order or 0),
    config=q.config,
    options=options,
  )


@router.patch(
  '/{survey_id}/questions/{question_id}',
  response_model=SurveyQuestionResponse,
  summary='Обновить вопрос анкеты',
  description='Обновляет формулировку и обязательность вопроса в анкете текущей компании.',
)
async def update_survey_question (
  payload: SurveyQuestionUpdateRequest,
  survey_id: UUID,
  question_id: UUID,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> SurveyQuestionResponse:
  await _get_survey_or_404(db, current_user, survey_id)

  res = await db.execute(
    select(SurveyQuestion).where(SurveyQuestion.id == question_id, SurveyQuestion.survey_id == survey_id),
  )
  q = res.scalar_one_or_none()
  if q is None:
    raise HTTPException(status_code=404, detail='Вопрос не найден')

  q.title = payload.title.strip()
  q.required = bool(payload.required)
  if payload.sortOrder is not None:
    q.sort_order = int(payload.sortOrder)

  await db.commit()

  opt_res = await db.execute(
    select(SurveyQuestionOption)
    .where(SurveyQuestionOption.question_id == q.id)
    .order_by(SurveyQuestionOption.sort_order.asc()),
  )
  options = [
    SurveyQuestionOptionItem(id=o.id, label=o.label, value=o.value, sortOrder=int(o.sort_order or 0))
    for o in opt_res.scalars().all()
  ]

  return SurveyQuestionResponse(question=_to_question_item(q, options))


@router.delete(
  '/{survey_id}/questions/{question_id}',
  status_code=status.HTTP_204_NO_CONTENT,
  summary='Удалить вопрос анкеты',
  description='Удаляет вопрос анкеты текущей компании.',
)
async def delete_survey_question (
  survey_id: UUID,
  question_id: UUID,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> None:
  await _get_survey_or_404(db, current_user, survey_id)

  res = await db.execute(
    select(SurveyQuestion).where(SurveyQuestion.id == question_id, SurveyQuestion.survey_id == survey_id),
  )
  q = res.scalar_one_or_none()
  if q is None:
    raise HTTPException(status_code=404, detail='Вопрос не найден')

  await db.delete(q)
  await db.commit()
  return None


@router.post(
  '',
  response_model=SurveyCreateResponse,
  status_code=status.HTTP_201_CREATED,
  summary='Создать анкету',
)
async def create_survey (
  payload: SurveyCreateRequest,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> SurveyCreateResponse:
  title = payload.title.strip()
  exists = await db.execute(
    select(Survey.id).where(Survey.company_id == current_user.company_id, func.lower(Survey.title) == title.lower()),
  )
  if exists.scalar_one_or_none() is not None:
    raise HTTPException(status_code=400, detail='Анкета с таким названием уже существует')

  survey = Survey(company_id=current_user.company_id, title=title, category=payload.category)
  db.add(survey)
  await db.commit()

  res = await db.execute(select(Survey).where(Survey.id == survey.id))
  survey = res.scalar_one()
  return SurveyCreateResponse(survey=to_survey_item(survey))


@router.post(
  '/{survey_id}/apply-template',
  status_code=status.HTTP_204_NO_CONTENT,
  summary='Применить шаблон анкеты',
  description='Применяет шаблон (один раз) и создаёт страницы/вопросы анкеты.',
)
async def apply_survey_template (
  payload: SurveyApplyTemplateRequest,
  survey_id: UUID,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> None:
  template_key = payload.templateKey.strip()
  if template_key not in ('price_monitoring_full', 'price_monitoring_quick'):
    raise HTTPException(status_code=400, detail='Неизвестный шаблон')

  try:
    # Одна транзакция на запрос уже начата сессией; используем явный lock + commit.
    locked_res = await db.execute(
      select(Survey).where(Survey.id == survey_id, Survey.company_id == current_user.company_id).with_for_update(),
    )
    locked = locked_res.scalar_one_or_none()
    if locked is None:
      raise HTTPException(status_code=404, detail='Анкета не найдена')
    if locked.category != 'price_monitoring':
      raise HTTPException(status_code=400, detail='Шаблоны доступны только для категории «Ценовой мониторинг»')
    if locked.template_key is not None:
      raise HTTPException(status_code=400, detail='Шаблон уже выбран')

    pages, _, _ = _template_full(survey_id) if template_key == 'price_monitoring_full' else _template_quick(survey_id)
    db.add_all(pages)
    await db.flush()

    page_by_title: dict[str, SurveyPage] = {p.title: p for p in pages}

    questions: list[SurveyQuestion] = []
    select_options: list[tuple[SurveyQuestion, int, str, str]] = []

    def add_select (
      page_title: str,
      sort_order: int,
      title: str,
      required: bool,
      opts: list[tuple[str, str]],
      config: dict | None = None,
    ) -> None:
      page = page_by_title[page_title]
      q = SurveyQuestion(
        survey_id=survey_id,
        page_id=page.id,
        type='select',
        title=title,
        required=required,
        sort_order=sort_order,
        config=config,
      )
      questions.append(q)
      for idx, (label, value) in enumerate(opts, start=1):
        select_options.append((q, idx, label, value))

    def add_question (
      page_title: str,
      qtype: str,
      sort_order: int,
      title: str,
      required: bool,
      config: dict | None,
    ) -> None:
      page = page_by_title[page_title]
      questions.append(
        SurveyQuestion(
          survey_id=survey_id,
          page_id=page.id,
          type=qtype,
          title=title,
          required=required,
          sort_order=sort_order,
          config=config,
        ),
      )

    if template_key == 'price_monitoring_full':
      add_question(
        'Анкета',
        'select',
        1,
        'Группа товаров',
        True,
        {'code': 'productGroup', 'source': 'project_checklist_categories'},
      )
      add_question(
        'Анкета',
        'select',
        2,
        'Бренд товара',
        True,
        {'code': 'productBrand', 'source': 'project_checklist_brands', 'dependsOn': ['productGroup']},
      )
      add_question(
        'Анкета',
        'select',
        3,
        'Номенклатура',
        True,
        {'code': 'productSku', 'source': 'project_checklist_products', 'dependsOn': ['productGroup', 'productBrand']},
      )
      add_question(
        'Анкета',
        'boolean',
        4,
        'Подтверждаю, что не нашёл товар в номенклатуре',
        False,
        {'code': 'productNotFoundConfirm'},
      )
      add_question(
        'Анкета',
        'money',
        5,
        'Цена в магазине без карты',
        True,
        {'code': 'priceNoCard', 'currency': 'RUB'},
      )
      add_question(
        'Анкета',
        'money',
        6,
        'Цена в магазине с картой',
        False,
        {'code': 'priceWithCard', 'currency': 'RUB'},
      )
      add_question(
        'Анкета',
        'money',
        7,
        'Акционная цена на сайте',
        False,
        {'code': 'promoSitePrice', 'currency': 'RUB'},
      )
      add_question(
        'Анкета',
        'number',
        8,
        'Кол-во фейсов на полке',
        False,
        {'code': 'facesCount', 'min': 0, 'step': 1},
      )
      add_question(
        'Анкета',
        'number',
        9,
        'Товарный запас в магазине, шт',
        False,
        {'code': 'stockQty', 'min': 0, 'step': 1},
      )
      add_question(
        'Анкета',
        'photo',
        10,
        'Загрузить фото',
        False,
        {'code': 'productPhoto', 'maxFiles': 5},
      )
      add_question(
        'Анкета',
        'text',
        11,
        'Комментарии аудитора по результатам проверки',
        False,
        {'code': 'auditorComment', 'multiline': True, 'rows': 4},
      )

      # Скрининг (1 страница): интро + дата/время старта + магазин/аудитор/фото
      add_question(
        'Скрининг',
        'intro',
        1,
        'Стартовая страница',
        False,
        {
          'code': 'intro',
          'text': 'Перед началом проверки заполните скрининг и подтвердите данные.',
          'nextLabel': 'Далее',
        },
      )
      add_question(
        'Скрининг',
        'datetime',
        2,
        'Начало проверки',
        True,
        {
          'code': 'startedAt',
          'defaultNow': True,
        },
      )
      add_question(
        'Скрининг',
        'select',
        3,
        'Регион',
        True,
        {'code': 'region', 'source': 'ref_regions', 'endpoint': '/projects/refs/regions', 'value': 'code', 'label': 'name'},
      )
      add_question(
        'Скрининг',
        'select',
        4,
        'Город',
        True,
        {'code': 'city', 'source': 'ref_cities', 'endpoint': '/projects/refs/cities', 'dependsOn': ['region'], 'value': 'name', 'label': 'name'},
      )
      add_question(
        'Скрининг',
        'select',
        5,
        'Бренд магазина',
        True,
        {'code': 'shopBrand', 'source': 'project_shop_brands', 'dependsOn': ['region', 'city']},
      )
      add_question(
        'Скрининг',
        'select',
        6,
        'Адрес магазина',
        True,
        {'code': 'shopAddress', 'source': 'project_shop_addresses', 'dependsOn': ['shopBrand', 'city']},
      )
      add_question(
        'Скрининг',
        'photo',
        11,
        'Загрузить фото магазина',
        False,
        {'code': 'shopPhoto', 'maxFiles': 5, 'hint': 'Сфотографируйте вывеску/вход/торговый зал'},
      )
    else:
      add_question(
        'Магазин',
        'project_point_picker',
        1,
        'В какой магазин вы пришли?',
        True,
        {'source': 'project_addressbook', 'hint': 'Выберите точку из адресной программы проекта'},
      )
      add_question(
        'Мониторинг цен',
        'price_grid',
        1,
        'Заполните мониторинг цен',
        True,
        {
          'source': 'project_checklist',
          'fields': [
            {'key': 'price', 'label': 'Цена', 'type': 'money', 'required': True},
            {'key': 'available', 'label': 'Наличие', 'type': 'boolean', 'required': False},
            {'key': 'comment', 'label': 'Комментарий', 'type': 'text', 'required': False},
          ],
        },
      )

    db.add_all(questions)
    await db.flush()

    if select_options:
      options: list[SurveyQuestionOption] = []
      for q, idx, label, value in select_options:
        options.append(SurveyQuestionOption(question_id=q.id, label=label, value=value, sort_order=idx))
      db.add_all(options)

    locked.template_key = template_key
    await db.commit()
  except HTTPException:
    await db.rollback()
    raise
  except Exception:
    await db.rollback()
    raise

  return None


@router.patch(
  '/{survey_id}',
  response_model=SurveyUpdateResponse,
  summary='Обновить анкету',
  description='Обновляет анкету текущей компании.',
)
async def update_survey (
  payload: SurveyUpdateRequest,
  survey_id: UUID,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> SurveyUpdateResponse:
  res = await db.execute(select(Survey).where(Survey.id == survey_id, Survey.company_id == current_user.company_id))
  survey = res.scalar_one_or_none()
  if survey is None:
    raise HTTPException(status_code=404, detail='Анкета не найдена')

  title = payload.title.strip()
  exists = await db.execute(
    select(Survey.id).where(
      Survey.company_id == current_user.company_id,
      func.lower(Survey.title) == title.lower(),
      Survey.id != survey.id,
    ),
  )
  if exists.scalar_one_or_none() is not None:
    raise HTTPException(status_code=400, detail='Анкета с таким названием уже существует')

  survey.title = title
  survey.category = payload.category
  await db.commit()

  out = await db.execute(select(Survey).where(Survey.id == survey.id))
  survey = out.scalar_one()
  return SurveyUpdateResponse(survey=to_survey_item(survey))


@router.delete(
  '/{survey_id}',
  status_code=status.HTTP_204_NO_CONTENT,
  summary='Удалить анкету',
  description='Удаляет анкету текущей компании. Если анкета прикреплена к проектам — вернёт ошибку.',
)
async def delete_survey (
  survey_id: UUID,
  db: AsyncSession = Depends(get_db),
  current_user: User = Depends(get_current_user),
) -> None:
  res = await db.execute(select(Survey).where(Survey.id == survey_id, Survey.company_id == current_user.company_id))
  survey = res.scalar_one_or_none()
  if survey is None:
    raise HTTPException(status_code=404, detail='Анкета не найдена')

  attached = await db.execute(select(ProjectSurvey.project_id).where(ProjectSurvey.survey_id == survey_id).limit(1))
  if attached.scalar_one_or_none() is not None:
    raise HTTPException(status_code=400, detail='Анкета прикреплена к проекту. Сначала открепите её.')

  await db.delete(survey)
  await db.commit()
  return None

