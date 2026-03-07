from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class ChecklistItem(Base):
  __tablename__ = 'checklist_item'
  __table_args__ = (
    UniqueConstraint('checklist_id', 'category_id', 'product_id', name='uq_projects_checklist_item_unique'),
    {'schema': settings.projects_schema},
  )

  id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

  checklist_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.checklist.id', ondelete='CASCADE'),
    index=True,
  )
  checklist = relationship('Checklist', lazy='selectin')

  category_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.ref_category.id', ondelete='RESTRICT'),
    index=True,
  )
  category = relationship('RefCategory', lazy='selectin')

  product_id: Mapped[UUID] = mapped_column(
    PG_UUID(as_uuid=True),
    ForeignKey(f'{settings.projects_schema}.ref_product.id', ondelete='RESTRICT'),
    index=True,
  )
  product = relationship('RefProduct', lazy='selectin')

  sort_order: Mapped[int] = mapped_column(Integer, server_default='0')

