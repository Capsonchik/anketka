from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base
from app.models.user_role import UserRole


class User(Base):
  __tablename__ = 'app_user'
  __table_args__ = {'schema': settings.users_schema}

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
  public_id: Mapped[int] = mapped_column(
    BigInteger,
    unique=True,
    index=True,
    nullable=False,
    server_default=text("nextval('users.app_user_public_id_seq'::regclass)"),
  )

  first_name: Mapped[str] = mapped_column(String(120))
  last_name: Mapped[str] = mapped_column(String(120))

  # platform-level role (outside company/workspace roles)
  platform_role: Mapped[str] = mapped_column(String(20), server_default='user')

  role: Mapped[UserRole] = mapped_column(
    Enum(UserRole, name='user_role', schema=settings.users_schema),
    server_default=UserRole.admin.value,
  )

  company_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.users_schema}.company.id', ondelete='RESTRICT'),
    index=True,
  )
  company = relationship('Company', lazy='selectin')

  email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
  phone: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
  is_active: Mapped[bool] = mapped_column(default=True, server_default='true', index=True)
  ui_language: Mapped[str] = mapped_column(String(12), server_default='ru', index=True)
  profile_company: Mapped[str | None] = mapped_column(String(250), nullable=True)
  note: Mapped[str | None] = mapped_column(Text, nullable=True)
  temporary_password: Mapped[str | None] = mapped_column(Text, nullable=True)

  permissions: Mapped[list[str]] = mapped_column(JSONB, server_default='[]')

  password_hash: Mapped[str] = mapped_column(String(255))

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
  )

