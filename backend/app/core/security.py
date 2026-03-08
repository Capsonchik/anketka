import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

JWT_ALG = 'HS256'

BCRYPT_MAX_BYTES = 72


def hash_password (password: str) -> str:
  if len(password.encode('utf-8')) > BCRYPT_MAX_BYTES:
    raise ValueError(f'Пароль слишком длинный (bcrypt максимум {BCRYPT_MAX_BYTES} байт)')
  return pwd_context.hash(password)


def verify_password (password: str, password_hash: str) -> bool:
  return pwd_context.verify(password, password_hash)


def _now_utc () -> datetime:
  return datetime.now(timezone.utc)


def create_access_token (*, subject: str, actor: str | None = None) -> str:
  now = _now_utc()
  exp = now + timedelta(minutes=settings.access_token_expire_minutes)
  payload: dict[str, Any] = {
    'typ': 'access',
    'sub': subject,
    'iat': int(now.timestamp()),
    'exp': int(exp.timestamp()),
  }
  if actor:
    payload['actor'] = actor
  return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALG)


def create_refresh_token (*, subject: str, actor: str | None = None) -> tuple[str, str]:
  now = _now_utc()
  exp = now + timedelta(days=settings.refresh_token_expire_days)
  jti = str(uuid4())
  payload: dict[str, Any] = {
    'typ': 'refresh',
    'sub': subject,
    'jti': jti,
    'iat': int(now.timestamp()),
    'exp': int(exp.timestamp()),
  }
  if actor:
    payload['actor'] = actor
  token = jwt.encode(payload, settings.secret_key, algorithm=JWT_ALG)
  return token, jti


def decode_token (token: str) -> dict[str, Any]:
  return jwt.decode(token, settings.secret_key, algorithms=[JWT_ALG])


def hash_refresh_token (token: str) -> str:
  msg = token.encode('utf-8')
  key = settings.refresh_token_pepper.encode('utf-8')
  digest = hmac.new(key, msg, hashlib.sha256).hexdigest()
  return digest

