from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class CompanySettings(Base):
  __tablename__ = 'company_settings'
  __table_args__ = {'schema': settings.users_schema}

  company_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.company.id', ondelete='CASCADE'),
    primary_key=True,
  )
  company = relationship('Company', foreign_keys=[company_id], lazy='selectin')

  category: Mapped[str | None] = mapped_column(String(120), nullable=True)

  logo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
  background_path: Mapped[str | None] = mapped_column(Text, nullable=True)

  theme: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
  filters: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

  is_archived: Mapped[bool] = mapped_column(default=False, server_default='false', index=True)

  base_ap_project_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
  )

