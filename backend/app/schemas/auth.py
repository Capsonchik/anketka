from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserPublic


def validate_bcrypt_password (value: str) -> str:
  if len(value.encode('utf-8')) > 72:
    raise ValueError('Пароль слишком длинный (bcrypt максимум 72 байта)')
  return value


class RegisterRequest(BaseModel):
  firstName: str = Field(min_length=1, max_length=120)
  lastName: str = Field(min_length=1, max_length=120)
  organization: str | None = Field(default=None, max_length=200)
  email: EmailStr
  phone: str = Field(min_length=5, max_length=32)
  password: str = Field(min_length=6, max_length=200)

  @field_validator('password')
  @classmethod
  def _password_max_72_bytes (cls, v: str) -> str:
    return validate_bcrypt_password(v)


class LoginRequest(BaseModel):
  email: EmailStr
  password: str = Field(min_length=1, max_length=200)

  @field_validator('password')
  @classmethod
  def _password_max_72_bytes (cls, v: str) -> str:
    return validate_bcrypt_password(v)


class RefreshRequest(BaseModel):
  refreshToken: str = Field(min_length=1)


class AuthTokens(BaseModel):
  accessToken: str
  refreshToken: str
  tokenType: str = 'bearer'
  expiresInSeconds: int


class AuthResponse(BaseModel):
  user: UserPublic
  tokens: AuthTokens


class RefreshTokenRow(BaseModel):
  tokenHash: str
  jti: str
  userId: str
  expiresAt: datetime

