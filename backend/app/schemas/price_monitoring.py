from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.surveys import SurveyBuilderResponse

class PriceMonitoringProjectItem(BaseModel):
  id: UUID
  name: str


class PriceMonitoringSurveyItem(BaseModel):
  id: UUID
  title: str


class PriceMonitoringRespondentItem(BaseModel):
  auditorId: UUID | None = None
  name: str | None = None
  phone: str | None = None
  email: str | None = None


class PriceMonitoringAttemptItem(BaseModel):
  id: UUID
  submittedAt: datetime | None = None
  createdAt: datetime
  mode: str | None = None

  project: PriceMonitoringProjectItem
  survey: PriceMonitoringSurveyItem
  purpose: str | None = None

  respondent: PriceMonitoringRespondentItem

  regionCode: str | None = None
  city: str | None = None
  shopBrandId: UUID | None = None
  shopBrandName: str | None = None
  shopAddressId: UUID | None = None
  shopAddressLabel: str | None = None

  productGroup: str | None = None
  productBrand: str | None = None
  productSkuId: UUID | None = None
  productSkuLabel: str | None = None


class PriceMonitoringAttemptsResponse(BaseModel):
  items: list[PriceMonitoringAttemptItem]
  total: int
  limit: int
  offset: int


class PriceMonitoringCountPoint(BaseModel):
  label: str
  count: int


class PriceMonitoringDailyCountItem(BaseModel):
  day: date
  count: int


class PriceMonitoringStatsResponse(BaseModel):
  totalAttempts: int
  uniqueRespondents: int
  uniqueShops: int

  byDay: list[PriceMonitoringDailyCountItem]
  topRegions: list[PriceMonitoringCountPoint]
  topCities: list[PriceMonitoringCountPoint]
  topShopBrands: list[PriceMonitoringCountPoint]


class PriceMonitoringAttemptDetailsResponse(BaseModel):
  attempt: PriceMonitoringAttemptItem
  builder: SurveyBuilderResponse
  storedAnswers: dict

