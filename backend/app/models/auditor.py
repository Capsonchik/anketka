from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


class Auditor(Base):
  __tablename__ = 'auditor'
  __table_args__ = (
    UniqueConstraint('company_id', 'email', 'phone', name='uq_projects_auditor_company_email_phone'),
    {'schema': settings.projects_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  company_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.company.id', ondelete='RESTRICT'),
    index=True,
    nullable=False,
  )

  last_name: Mapped[str] = mapped_column(String(120), index=True)
  first_name: Mapped[str] = mapped_column(String(120), index=True)
  middle_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

  phone: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
  email: Mapped[str | None] = mapped_column(String(320), nullable=True, index=True)

  password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

  city: Mapped[str] = mapped_column(String(250), index=True)

  birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
  gender: Mapped[str | None] = mapped_column(String(16), nullable=True)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

