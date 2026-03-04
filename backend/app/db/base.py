from app.db.base_class import Base


# Важно: импортируем модели, чтобы они зарегистрировались в metadata
from app.models.company import Company  # noqa: E402,F401
from app.models.project import Project  # noqa: E402,F401
from app.models.refresh_token import RefreshToken  # noqa: E402,F401
from app.models.ref_city import RefCity  # noqa: E402,F401
from app.models.ref_region import RefRegion  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401

