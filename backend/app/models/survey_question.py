from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


class SurveyQuestion(Base):
  __tablename__ = 'survey_question'
  __table_args__ = ({'schema': settings.projects_schema},)

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  survey_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.survey.id', ondelete='CASCADE'),
    index=True,
    nullable=False,
  )

  page_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.survey_page.id', ondelete='CASCADE'),
    index=True,
    nullable=False,
  )

  type: Mapped[str] = mapped_column(String(48), nullable=False)
  code: Mapped[str | None] = mapped_column(String(64), nullable=True)
  title: Mapped[str] = mapped_column(String(500), nullable=False)
  description: Mapped[str | None] = mapped_column(String(500), nullable=True)
  required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='false')
  sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
  config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
  validation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
  logic: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
  scoring: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
  display: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
  media: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
  analytics_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
  weight: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default='0', nullable=False)
  allow_na: Mapped[bool] = mapped_column(Boolean, server_default='false', nullable=False)
  allow_comment: Mapped[bool] = mapped_column(Boolean, server_default='false', nullable=False)
  dynamic_title_template: Mapped[str | None] = mapped_column(String(1000), nullable=True)

