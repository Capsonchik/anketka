from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import decode_token
from app.db.session import get_db
from app.models.auditor import Auditor
from app.models.owner_company_access import OwnerCompanyAccess
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def _now_utc () -> datetime:
  return datetime.now(timezone.utc)


async def get_current_user (
  credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
  x_company_id: str | None = Header(default=None, alias='X-Company-Id'),
  db: AsyncSession = Depends(get_db),
) -> User:
  if credentials is None or not credentials.credentials:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')

  token = credentials.credentials
  try:
    payload = decode_token(token)
  except Exception:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

  if payload.get('typ') != 'access':
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token type')
  if payload.get('actor') == 'auditor':
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token actor')

  sub = payload.get('sub')
  if not sub:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token payload')

  try:
    user_id = UUID(str(sub))
  except Exception:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token subject')

  res = await db.execute(select(User).options(selectinload(User.company)).where(User.id == user_id))
  user = res.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')
  if user.is_active is False:
    raise HTTPException(status_code=403, detail='Пользователь деактивирован')

  active_company_id = user.company_id
  if (user.platform_role or 'user') == 'owner' and x_company_id and x_company_id.strip():
    try:
      requested = UUID(x_company_id.strip())
    except Exception:
      raise HTTPException(status_code=400, detail='Некорректный X-Company-Id')

    access_res = await db.execute(
      select(OwnerCompanyAccess.id).where(
        OwnerCompanyAccess.owner_user_id == user.id,
        OwnerCompanyAccess.company_id == requested,
      ),
    )
    if access_res.scalar_one_or_none() is None:
      raise HTTPException(status_code=403, detail='Нет доступа к клиенту')

    active_company_id = requested

  # do NOT mutate mapped company_id; store request-scoped context separately
  setattr(user, 'active_company_id', active_company_id)

  return user


async def get_current_auditor (
  credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
  db: AsyncSession = Depends(get_db),
) -> Auditor:
  if credentials is None or not credentials.credentials:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')

  token = credentials.credentials
  try:
    payload = decode_token(token)
  except Exception:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

  if payload.get('typ') != 'access':
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token type')
  if payload.get('actor') != 'auditor':
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token actor')

  sub = payload.get('sub')
  if not sub:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token payload')

  try:
    auditor_id = UUID(str(sub))
  except Exception:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token subject')

  res = await db.execute(select(Auditor).where(Auditor.id == auditor_id))
  auditor = res.scalar_one_or_none()
  if auditor is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Auditor not found')

  return auditor

