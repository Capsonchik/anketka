from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base

AttemptState = str  # draft | submitted | cancelled


class SurveyAttempt(Base):
  __tablename__ = 'survey_attempt'
  __table_args__ = {'schema': settings.projects_schema}

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  invite_token: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.survey_invite.token', ondelete='RESTRICT'),
    index=True,
  )

  project_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.project.id', ondelete='CASCADE'),
    index=True,
  )

  survey_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.survey.id', ondelete='CASCADE'),
    index=True,
  )

  auditor_id: Mapped[UUID | None] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.auditor.id', ondelete='SET NULL'),
    nullable=True,
    index=True,
  )

  answers: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
  state: Mapped[str] = mapped_column(String(24), server_default='submitted', nullable=False, index=True)
  context: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
  score_total: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
  score_max: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
  score_percent: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
  score_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  last_saved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

