from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


class AuditorRefreshToken(Base):
  __tablename__ = 'auditor_refresh_token'
  __table_args__ = {'schema': settings.projects_schema}

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  auditor_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.auditor.id', ondelete='CASCADE'),
    index=True,
  )

  jti: Mapped[str] = mapped_column(String(64), unique=True, index=True)
  token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
  revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

