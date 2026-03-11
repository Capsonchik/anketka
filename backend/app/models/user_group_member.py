from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class UserGroupMember(Base):
  __tablename__ = 'user_group_member'
  __table_args__ = (
    UniqueConstraint('group_id', 'user_id', name='uq_users_user_group_member_group_user'),
    {'schema': settings.users_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  group_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.user_group.id', ondelete='CASCADE'),
    index=True,
    nullable=False,
  )
  group = relationship('UserGroup', foreign_keys=[group_id], back_populates='members', lazy='selectin')

  user_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='CASCADE'),
    index=True,
    nullable=False,
  )
  user = relationship('User', foreign_keys=[user_id], lazy='selectin')

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

