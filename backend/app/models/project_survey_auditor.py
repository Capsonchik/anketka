from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


class ProjectSurveyAuditor(Base):
  __tablename__ = 'project_survey_auditor'
  __table_args__ = (
    UniqueConstraint('project_id', 'survey_id', 'auditor_id', name='uq_projects_project_survey_auditor_unique'),
    {'schema': settings.projects_schema},
  )

  project_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.project.id', ondelete='CASCADE'),
    primary_key=True,
  )

  survey_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.survey.id', ondelete='CASCADE'),
    primary_key=True,
  )

  auditor_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.auditor.id', ondelete='CASCADE'),
    primary_key=True,
  )

  assigned_by_user_id: Mapped[UUID | None] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='RESTRICT'),
    nullable=True,
    index=True,
  )

  assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  status: Mapped[str] = mapped_column(String(24), server_default='assigned', index=True)
  accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  declined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  in_progress_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

