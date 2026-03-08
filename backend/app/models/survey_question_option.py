from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


class SurveyQuestionOption(Base):
  __tablename__ = 'survey_question_option'
  __table_args__ = ({'schema': settings.projects_schema},)

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  question_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.survey_question.id', ondelete='CASCADE'),
    index=True,
    nullable=False,
  )

  label: Mapped[str] = mapped_column(String(250), nullable=False)
  value: Mapped[str] = mapped_column(String(250), nullable=False)
  sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')

