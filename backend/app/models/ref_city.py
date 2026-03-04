from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base_class import Base


class RefCity(Base):
  __tablename__ = 'ref_city'
  __table_args__ = {'schema': settings.projects_schema}

  id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

  region_code: Mapped[str] = mapped_column(
    String(3),
    ForeignKey(f'{settings.projects_schema}.ref_region.code', ondelete='RESTRICT'),
    index=True,
  )
  region = relationship('RefRegion', lazy='selectin')

  name: Mapped[str] = mapped_column(String(250), index=True)

