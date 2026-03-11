from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class UserProjectAccess(Base):
  __tablename__ = 'user_project_access'
  __table_args__ = (
    UniqueConstraint('user_id', 'project_id', name='uq_projects_user_project_access_user_project'),
    {'schema': settings.projects_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  user_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='CASCADE'),
    index=True,
  )
  user = relationship('User', foreign_keys=[user_id], lazy='selectin')

  project_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.project.id', ondelete='CASCADE'),
    index=True,
  )
  project = relationship('Project', foreign_keys=[project_id], lazy='selectin')

  access_role: Mapped[str] = mapped_column(String(30))
  region_codes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

  assigned_by_user_id: Mapped[UUID | None] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='SET NULL'),
    nullable=True,
  )
  assigned_by_user = relationship('User', foreign_keys=[assigned_by_user_id], lazy='selectin')

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
  )

