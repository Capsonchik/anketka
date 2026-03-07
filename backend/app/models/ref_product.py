from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class RefProduct(Base):
  __tablename__ = 'ref_product'
  __table_args__ = (
    UniqueConstraint('brand_id', 'article', 'name', 'size', name='uq_projects_ref_product_brand_article_name_size'),
    {'schema': settings.projects_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  brand_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.ref_brand.id', ondelete='RESTRICT'),
    index=True,
  )
  brand = relationship('RefBrand', lazy='selectin')

  article: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
  name: Mapped[str] = mapped_column(Text)
  size: Mapped[str | None] = mapped_column(String(120), nullable=True)

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

