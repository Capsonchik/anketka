from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class UserGroup(Base):
  __tablename__ = 'user_group'
  __table_args__ = (
    UniqueConstraint('company_id', 'name', name='uq_users_user_group_company_name'),
    {'schema': settings.users_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  company_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.company.id', ondelete='CASCADE'),
    index=True,
    nullable=False,
  )

  name: Mapped[str] = mapped_column(String(200), nullable=False)

  created_by_user_id: Mapped[UUID | None] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='SET NULL'),
    nullable=True,
  )
  created_by_user = relationship('User', foreign_keys=[created_by_user_id], lazy='selectin')

  members = relationship('UserGroupMember', back_populates='group', lazy='selectin', cascade='all, delete-orphan')

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

