from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


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

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

