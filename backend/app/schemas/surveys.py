from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field
from typing import Literal

SurveyCategory = Literal['price_monitoring', 'mystery']

class SurveyItem(BaseModel):
  id: UUID
  title: str
  category: SurveyCategory
  templateKey: str | None = None
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


class SurveyQuestionItem(BaseModel):
  id: UUID
  type: str
  title: str
  required: bool
  sortOrder: int
  config: dict | None = None
  options: list[SurveyQuestionOptionItem] = []


class SurveyPageItem(BaseModel):
  id: UUID
  title: str
  sortOrder: int
  questions: list[SurveyQuestionItem]


class SurveyBuilderResponse(BaseModel):
  surveyId: UUID
  pages: list[SurveyPageItem]

class SurveyQuestionUpdateRequest(BaseModel):
  title: str = Field(min_length=1, max_length=500)
  required: bool
  sortOrder: int | None = None


class SurveyQuestionResponse(BaseModel):
  question: SurveyQuestionItem


class ProjectSurveyAttachRequest(BaseModel):
  surveyId: UUID


class ProjectSurveysResponse(BaseModel):
  items: list[SurveyItem]

