from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base

SectionType = str  # regular | loop


class SurveyPage(Base):
  __tablename__ = 'survey_page'
  __table_args__ = ({'schema': settings.projects_schema},)

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  survey_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.survey.id', ondelete='CASCADE'),
    index=True,
    nullable=False,
  )

  title: Mapped[str] = mapped_column(String(250), nullable=False)
  sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
  section_type: Mapped[str] = mapped_column(String(24), server_default='regular', nullable=False)
  loop_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

