from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
  create_access_token,
  create_refresh_token,
  decode_token,
  hash_password,
  hash_refresh_token,
  verify_password,
)
from app.db.session import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
  AuthResponse,
  AuthTokens,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
)
from app.schemas.user import UserPublic


router = APIRouter()


def _now_utc () -> datetime:
  return datetime.now(timezone.utc)


def to_user_public (user: User) -> UserPublic:
  return UserPublic(
    id=user.id,
    firstName=user.first_name,
    lastName=user.last_name,
    organization=user.organization,
    email=user.email,
    phone=user.phone,
    createdAt=user.created_at,
  )


def _tokens_for_user (user: User) -> tuple[AuthTokens, str, str]:
  access_token = create_access_token(subject=str(user.id))
  refresh_token, jti = create_refresh_token(subject=str(user.id))
  tokens = AuthTokens(
    accessToken=access_token,
    refreshToken=refresh_token,
    expiresInSeconds=settings.access_token_expire_minutes * 60,
  )
  return tokens, refresh_token, jti


async def _persist_refresh_token (
  *,
  db: AsyncSession,
  user_id: UUID,
  refresh_token: str,
  jti: str,
) -> None:
  expires_at = _now_utc() + timedelta(days=settings.refresh_token_expire_days)
  row = RefreshToken(
    user_id=user_id,
    jti=jti,
    token_hash=hash_refresh_token(refresh_token),
    expires_at=expires_at,
  )
  db.add(row)


@router.post('/register', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register (payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
  res = await db.execute(
    select(User).where(or_(User.email == payload.email, User.phone == payload.phone)),
  )
  existing = res.scalar_one_or_none()
  if existing is not None:
    raise HTTPException(status_code=400, detail='User already exists')

  user = User(
    first_name=payload.firstName,
    last_name=payload.lastName,
    organization=payload.organization,
    email=str(payload.email),
    phone=payload.phone,
    password_hash=hash_password(payload.password),
  )
  db.add(user)
  await db.flush()

  tokens, refresh_token, jti = _tokens_for_user(user)
  await _persist_refresh_token(db=db, user_id=user.id, refresh_token=refresh_token, jti=jti)

  await db.commit()
  await db.refresh(user)

  return AuthResponse(user=to_user_public(user), tokens=tokens)


@router.post('/login', response_model=AuthResponse)
async def login (payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
  res = await db.execute(select(User).where(User.email == payload.email))
  user = res.scalar_one_or_none()
  if user is None or not verify_password(payload.password, user.password_hash):
    raise HTTPException(status_code=400, detail='Invalid credentials')

  tokens, refresh_token, jti = _tokens_for_user(user)
  await _persist_refresh_token(db=db, user_id=user.id, refresh_token=refresh_token, jti=jti)
  await db.commit()

  return AuthResponse(user=to_user_public(user), tokens=tokens)


@router.post('/refresh', response_model=AuthTokens)
async def refresh (payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> AuthTokens:
  try:
    token_payload = decode_token(payload.refreshToken)
  except Exception:
    raise HTTPException(status_code=401, detail='Invalid refresh token')

  if token_payload.get('typ') != 'refresh':
    raise HTTPException(status_code=401, detail='Invalid refresh token type')

  sub = token_payload.get('sub')
  jti = token_payload.get('jti')
  if not sub or not jti:
    raise HTTPException(status_code=401, detail='Invalid refresh token payload')

  try:
    user_id = UUID(str(sub))
  except Exception:
    raise HTTPException(status_code=401, detail='Invalid refresh token subject')

  token_hash = hash_refresh_token(payload.refreshToken)
  res = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
  row = res.scalar_one_or_none()
  if row is None or row.revoked_at is not None or row.jti != str(jti) or row.user_id != user_id:
    raise HTTPException(status_code=401, detail='Refresh token revoked')

  now = _now_utc()
  if row.expires_at <= now:
    raise HTTPException(status_code=401, detail='Refresh token expired')

  user_res = await db.execute(select(User).where(User.id == user_id))
  user = user_res.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=401, detail='User not found')

  row.revoked_at = now

  tokens, new_refresh_token, new_jti = _tokens_for_user(user)
  await _persist_refresh_token(db=db, user_id=user.id, refresh_token=new_refresh_token, jti=new_jti)
  await db.commit()

  return tokens


@router.post('/logout')
async def logout (payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> dict:
  token_hash = hash_refresh_token(payload.refreshToken)
  res = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
  row = res.scalar_one_or_none()
  if row is not None and row.revoked_at is None:
    row.revoked_at = _now_utc()
    await db.commit()
  return {'ok': True}

