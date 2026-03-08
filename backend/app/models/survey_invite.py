from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


class SurveyInvite(Base):
  __tablename__ = 'survey_invite'
  __table_args__ = {'schema': settings.projects_schema}

  token: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

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

  purpose: Mapped[str] = mapped_column(String(24), server_default='assignment', index=True)

  created_by_user_id: Mapped[UUID | None] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='SET NULL'),
    nullable=True,
    index=True,
  )

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

