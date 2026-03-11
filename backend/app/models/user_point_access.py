from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class UserPointAccess(Base):
  __tablename__ = 'user_point_access'
  __table_args__ = (
    UniqueConstraint('user_id', 'point_id', name='uq_projects_user_point_access_user_point'),
    {'schema': settings.projects_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  user_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='CASCADE'),
    index=True,
  )
  user = relationship('User', foreign_keys=[user_id], lazy='selectin')

  point_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.shop_point.id', ondelete='CASCADE'),
    index=True,
  )
  point = relationship('ShopPoint', foreign_keys=[point_id], lazy='selectin')

  assigned_by_user_id: Mapped[UUID | None] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='SET NULL'),
    nullable=True,
  )
  assigned_by_user = relationship('User', foreign_keys=[assigned_by_user_id], lazy='selectin')

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

