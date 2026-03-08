from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
  create_access_token,
  create_refresh_token,
  decode_token,
  hash_refresh_token,
  verify_password,
)
from app.db.session import get_db
from app.models.auditor import Auditor
from app.models.auditor_refresh_token import AuditorRefreshToken
from app.schemas.auditor_portal import AuditorAuthResponse, AuditorLoginRequest, AuditorPublic
from app.schemas.auth import AuthTokens, RefreshRequest


router = APIRouter()


def _now_utc () -> datetime:
  return datetime.now(timezone.utc)


def to_auditor_public (a: Auditor) -> AuditorPublic:
  return AuditorPublic(
    id=a.id,
    companyId=a.company_id,
    firstName=a.first_name,
    lastName=a.last_name,
    middleName=a.middle_name,
    email=a.email,
    phone=a.phone,
    city=a.city,
  )


def _tokens_for_auditor (auditor: Auditor) -> tuple[AuthTokens, str, str]:
  access_token = create_access_token(subject=str(auditor.id), actor='auditor')
  refresh_token, jti = create_refresh_token(subject=str(auditor.id), actor='auditor')
  tokens = AuthTokens(
    accessToken=access_token,
    refreshToken=refresh_token,
    expiresInSeconds=settings.access_token_expire_minutes * 60,
  )
  return tokens, refresh_token, jti


async def _persist_refresh_token (
  *,
  db: AsyncSession,
  auditor_id: UUID,
  refresh_token: str,
  jti: str,
) -> None:
  expires_at = _now_utc() + timedelta(days=settings.refresh_token_expire_days)
  row = AuditorRefreshToken(
    auditor_id=auditor_id,
    jti=jti,
    token_hash=hash_refresh_token(refresh_token),
    expires_at=expires_at,
  )
  db.add(row)


@router.post('/login', response_model=AuditorAuthResponse)
async def login (payload: AuditorLoginRequest, db: AsyncSession = Depends(get_db)) -> AuditorAuthResponse:
  email = str(payload.email).strip()
  res = await db.execute(select(Auditor).where(func.lower(Auditor.email) == email.lower()))
  auditor = res.scalar_one_or_none()
  if auditor is None:
    raise HTTPException(status_code=400, detail='Неверные данные для входа')
  if not auditor.password_hash:
    raise HTTPException(status_code=400, detail='Для аудитора не задан пароль')
  if not verify_password(payload.password, auditor.password_hash):
    raise HTTPException(status_code=400, detail='Неверные данные для входа')

  tokens, refresh_token, jti = _tokens_for_auditor(auditor)
  await _persist_refresh_token(db=db, auditor_id=auditor.id, refresh_token=refresh_token, jti=jti)
  await db.commit()

  return AuditorAuthResponse(auditor=to_auditor_public(auditor), tokens=tokens)


@router.post('/refresh', response_model=AuthTokens)
async def refresh (payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> AuthTokens:
  try:
    token_payload = decode_token(payload.refreshToken)
  except Exception:
    raise HTTPException(status_code=401, detail='Invalid refresh token')

  if token_payload.get('typ') != 'refresh' or token_payload.get('actor') != 'auditor':
    raise HTTPException(status_code=401, detail='Invalid refresh token type')

  sub = token_payload.get('sub')
  jti = token_payload.get('jti')
  if not sub or not jti:
    raise HTTPException(status_code=401, detail='Invalid refresh token payload')

  try:
    auditor_id = UUID(str(sub))
  except Exception:
    raise HTTPException(status_code=401, detail='Invalid refresh token subject')

  token_hash = hash_refresh_token(payload.refreshToken)
  res = await db.execute(select(AuditorRefreshToken).where(AuditorRefreshToken.token_hash == token_hash))
  row = res.scalar_one_or_none()
  if row is None or row.revoked_at is not None or row.jti != str(jti) or row.auditor_id != auditor_id:
    raise HTTPException(status_code=401, detail='Refresh token revoked')

  now = _now_utc()
  if row.expires_at <= now:
    raise HTTPException(status_code=401, detail='Refresh token expired')

  aud_res = await db.execute(select(Auditor).where(Auditor.id == auditor_id))
  auditor = aud_res.scalar_one_or_none()
  if auditor is None:
    raise HTTPException(status_code=401, detail='Auditor not found')

  row.revoked_at = now
  tokens, new_refresh_token, new_jti = _tokens_for_auditor(auditor)
  await _persist_refresh_token(db=db, auditor_id=auditor.id, refresh_token=new_refresh_token, jti=new_jti)
  await db.commit()

  return tokens


@router.post('/logout')
async def logout (payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> dict:
  token_hash = hash_refresh_token(payload.refreshToken)
  res = await db.execute(select(AuditorRefreshToken).where(AuditorRefreshToken.token_hash == token_hash))
  row = res.scalar_one_or_none()
  if row is not None and row.revoked_at is None:
    row.revoked_at = _now_utc()
    await db.commit()
  return {'ok': True}

