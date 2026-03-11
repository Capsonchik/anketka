from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class ShopPoint(Base):
  __tablename__ = 'shop_point'
  __table_args__ = (
    UniqueConstraint('project_id', 'code', name='uq_projects_shop_point_project_code'),
    {'schema': settings.projects_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  project_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.project.id', ondelete='CASCADE'),
    index=True,
  )
  project = relationship('Project', lazy='selectin')

  chain_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.shop_chain.id', ondelete='RESTRICT'),
    index=True,
  )
  chain = relationship('ShopChain', lazy='selectin')

  code: Mapped[str] = mapped_column(String(120))
  point_name: Mapped[str | None] = mapped_column(String(250), nullable=True)

  address: Mapped[str | None] = mapped_column(Text, nullable=True)
  region_code: Mapped[str | None] = mapped_column(String(3), nullable=True, index=True)
  city_name: Mapped[str | None] = mapped_column(String(250), nullable=True, index=True)

  concat: Mapped[str | None] = mapped_column(Text, nullable=True)

  attrs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default='{}')

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
  )

