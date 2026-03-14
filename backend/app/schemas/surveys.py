from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field
from typing import Literal

SurveyCategory = Literal['price_monitoring', 'mystery']
SurveyStatus = Literal['created', 'moderation', 'published', 'archived']
SectionType = Literal['regular', 'loop']
AttemptState = Literal['draft', 'submitted', 'cancelled']


class SurveyItem(BaseModel):
  id: UUID
  title: str
  category: SurveyCategory
  templateKey: str | None = None
  status: SurveyStatus = 'created'
  publishedAt: datetime | None = None
  archivedAt: datetime | None = None
  version: int = 1
  contextBindings: dict | None = None
  createdAt: datetime


class SurveysResponse(BaseModel):
  items: list[SurveyItem]


class SurveyResponse(BaseModel):
  survey: SurveyItem


class SurveyInviteItem(BaseModel):
  token: UUID
  projectId: UUID
  surveyId: UUID
  auditorId: UUID | None = None
  purpose: str
  createdAt: datetime


class SurveyInviteResponse(BaseModel):
  invite: SurveyInviteItem


class SurveyAttachedProjectItem(BaseModel):
  id: UUID
  name: str
  attachedAt: datetime


class SurveyAttachedProjectsResponse(BaseModel):
  items: list[SurveyAttachedProjectItem]


class SurveyCreateRequest(BaseModel):
  title: str = Field(min_length=1, max_length=250)
  category: SurveyCategory


class SurveyCreateResponse(BaseModel):
  survey: SurveyItem


class SurveyUpdateRequest(BaseModel):
  title: str = Field(min_length=1, max_length=250)
  category: SurveyCategory


class SurveyUpdateResponse(BaseModel):
  survey: SurveyItem


class SurveyApplyTemplateRequest(BaseModel):
  templateKey: str = Field(min_length=1, max_length=64)


class SurveyQuestionOptionItem(BaseModel):
  id: UUID
  label: str
  value: str
  sortOrder: int
  points: Decimal | float = 0
  isExclusive: bool = False
  isNA: bool = False


class SurveyQuestionItem(BaseModel):
  id: UUID
  type: str
  code: str | None = None
  title: str
  description: str | None = None
  required: bool
  sortOrder: int
  config: dict | None = None
  validation: dict | None = None
  logic: dict | None = None
  scoring: dict | None = None
  display: dict | None = None
  media: dict | None = None
  analyticsKey: str | None = None
  weight: Decimal | float = 0
  allowNa: bool = False
  allowComment: bool = False
  dynamicTitleTemplate: str | None = None
  options: list[SurveyQuestionOptionItem] = []


class SurveyPageItem(BaseModel):
  id: UUID
  title: str
  sortOrder: int
  sectionType: SectionType = 'regular'
  loopConfig: dict | None = None
  questions: list[SurveyQuestionItem]


class SurveyBuilderResponse(BaseModel):
  surveyId: UUID
  pages: list[SurveyPageItem]
  maxScore: Decimal | float | None = None
  status: SurveyStatus = 'created'


class SurveyQuestionUpdateRequest(BaseModel):
  title: str = Field(min_length=1, max_length=500)
  required: bool
  sortOrder: int | None = None
  code: str | None = None
  description: str | None = None
  validation: dict | None = None
  logic: dict | None = None
  scoring: dict | None = None
  display: dict | None = None
  media: dict | None = None
  analyticsKey: str | None = None
  weight: Decimal | float | None = None
  allowNa: bool | None = None
  allowComment: bool | None = None
  dynamicTitleTemplate: str | None = None


class SurveyQuestionResponse(BaseModel):
  question: SurveyQuestionItem


class SurveyPageCreateRequest(BaseModel):
  title: str = Field(min_length=1, max_length=250)
  sectionType: SectionType = 'regular'
  loopConfig: dict | None = None


class SurveyPageUpdateRequest(BaseModel):
  title: str | None = Field(None, min_length=1, max_length=250)
  sectionType: SectionType | None = None
  loopConfig: dict | None = None
  sortOrder: int | None = None


class SurveyQuestionCreateRequest(BaseModel):
  pageId: UUID
  type: str = Field(min_length=1, max_length=48)
  code: str | None = Field(None, max_length=64)
  title: str = Field(min_length=1, max_length=500)
  description: str | None = Field(None, max_length=500)
  required: bool = False
  sortOrder: int | None = None
  config: dict | None = None
  validation: dict | None = None
  logic: dict | None = None
  scoring: dict | None = None
  display: dict | None = None
  media: dict | None = None
  analyticsKey: str | None = None
  weight: Decimal | float = 0
  allowNa: bool = False
  allowComment: bool = False
  dynamicTitleTemplate: str | None = None


class SurveyQuestionOptionCreateRequest(BaseModel):
  label: str = Field(min_length=1, max_length=250)
  value: str = Field(min_length=1, max_length=250)
  sortOrder: int | None = None
  points: Decimal | float = 0
  isExclusive: bool = False
  isNA: bool = False


class SurveyQuestionOptionUpdateRequest(BaseModel):
  label: str | None = Field(None, min_length=1, max_length=250)
  value: str | None = Field(None, min_length=1, max_length=250)
  sortOrder: int | None = None
  points: Decimal | float | None = None
  isExclusive: bool | None = None
  isNA: bool | None = None


class SurveyReorderRequest(BaseModel):
  pageIds: list[UUID] | None = None
  questionIds: list[UUID] | None = None


class SurveySimulateRequest(BaseModel):
  answers: dict = Field(default_factory=dict)


class SurveySimulateResponse(BaseModel):
  valid: bool
  errors: dict[str, str] = Field(default_factory=dict)
  scoreTotal: Decimal | float | None = None
  scoreMax: Decimal | float | None = None
  scorePercent: Decimal | float | None = None
  scoreBreakdown: dict | None = None


class SurveyAnalyticsResponse(BaseModel):
  totalAttempts: int = 0
  completedAttempts: int = 0
  avgScorePercent: float | None = None
  scoreDistribution: list[dict] = Field(default_factory=list)


class ProjectSurveyAttachRequest(BaseModel):
  surveyId: UUID


class ProjectSurveysResponse(BaseModel):
  items: list[SurveyItem]

