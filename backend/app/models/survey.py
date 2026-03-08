from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


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

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

