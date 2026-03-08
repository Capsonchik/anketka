from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


class ProjectSurvey(Base):
  __tablename__ = 'project_survey'
  __table_args__ = (
    UniqueConstraint('project_id', 'survey_id', name='uq_projects_project_survey_unique'),
    {'schema': settings.projects_schema},
  )

  project_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.project.id', ondelete='CASCADE'),
    primary_key=True,
  )

  survey_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.survey.id', ondelete='RESTRICT'),
    primary_key=True,
  )

  attached_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

