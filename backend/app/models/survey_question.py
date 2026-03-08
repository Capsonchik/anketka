from uuid import UUID, uuid4

from sqlalchemy import Boolean, ForeignKey, Integer, String
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
  title: Mapped[str] = mapped_column(String(500), nullable=False)
  required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='false')
  sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
  config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

