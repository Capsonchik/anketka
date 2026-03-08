from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import decode_token
from app.db.session import get_db
from app.models.auditor import Auditor
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def _now_utc () -> datetime:
  return datetime.now(timezone.utc)


async def get_current_user (
  credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
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

