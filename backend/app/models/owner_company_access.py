from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class OwnerCompanyAccess(Base):
  __tablename__ = 'owner_company_access'
  __table_args__ = (
    UniqueConstraint('owner_user_id', 'company_id', name='uq_users_owner_company_access_owner_company'),
    {'schema': settings.users_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  owner_user_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.app_user.id', ondelete='CASCADE'),
    index=True,
  )
  owner_user = relationship('User', foreign_keys=[owner_user_id], lazy='selectin')

  company_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.company.id', ondelete='CASCADE'),
    index=True,
  )
  company = relationship('Company', foreign_keys=[company_id], lazy='selectin')

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

