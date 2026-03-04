from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class Project(Base):
  __tablename__ = 'project'
  __table_args__ = {'schema': settings.projects_schema}

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  company_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.company.id', ondelete='RESTRICT'),
    index=True,
  )

  manager_user_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='RESTRICT'),
    index=True,
  )
  manager = relationship('User', foreign_keys=[manager_user_id], lazy='selectin')

  name: Mapped[str] = mapped_column(String(200), index=True)
  comment: Mapped[str | None] = mapped_column(Text, nullable=True)

  start_date: Mapped[date] = mapped_column(Date)
  end_date: Mapped[date] = mapped_column(Date)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
  )

