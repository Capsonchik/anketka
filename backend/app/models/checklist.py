from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class Checklist(Base):
  __tablename__ = 'checklist'
  __table_args__ = (
    UniqueConstraint('project_id', 'chain_id', 'title', name='uq_projects_checklist_project_chain_title'),
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

  title: Mapped[str] = mapped_column(String(250))

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

