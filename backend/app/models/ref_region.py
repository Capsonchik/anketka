from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base_class import Base


class RefRegion(Base):
  __tablename__ = 'ref_region'
  __table_args__ = {'schema': settings.projects_schema}

  code: Mapped[str] = mapped_column(String(3), primary_key=True)
  name: Mapped[str] = mapped_column(String(250), index=True)

