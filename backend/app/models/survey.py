from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base

SurveyStatus = str  # created | moderation | published | archived


class Survey(Base):
  __tablename__ = 'survey'
  __table_args__ = (
    UniqueConstraint('company_id', 'title', name='uq_projects_survey_company_title'),
    {'schema': settings.projects_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  company_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.company.id', ondelete='RESTRICT'),
    index=True,
  )

  title: Mapped[str] = mapped_column(String(250), index=True)
  category: Mapped[str] = mapped_column(String(32), server_default='price_monitoring', index=True)
  template_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

  status: Mapped[str] = mapped_column(String(24), server_default='created', nullable=False, index=True)
  published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  version: Mapped[int] = mapped_column(Integer, server_default='1', nullable=False)
  context_bindings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

