import ssl

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

  app_env: str = 'dev'

  db_host: str = 'localhost'
  db_port: int = 5432
  db_user: str = 'user'
  db_password: str = 'admin'
  db_name: str = 'anketka_db'
  db_sslmode: str = 'disable'
  db_sslrootcert: str | None = None

  secret_key: str
  access_token_expire_minutes: int = 15
  refresh_token_expire_days: int = 30
  refresh_token_pepper: str

  api_v1_prefix: str = '/api/v1'
  users_schema: str = 'users'
  projects_schema: str = 'projects'

  @property
  def database_url_async (self) -> str:
    return (
      f'postgresql+asyncpg://{self.db_user}:{self.db_password}'
      f'@{self.db_host}:{self.db_port}/{self.db_name}'
    )

  @property
  def database_connect_args (self) -> dict:
    mode = (self.db_sslmode or 'disable').strip().lower()
    if mode in ('', 'disable', '0', 'false', 'no', 'off'):
      return {}

    if mode == 'require':
      ctx = ssl.create_default_context()
      ctx.check_hostname = False
      ctx.verify_mode = ssl.CERT_NONE
      return {'ssl': ctx}

    if mode in ('verify-ca', 'verify-full'):
      if not self.db_sslrootcert:
        raise ValueError('DB_SSLROOTCERT is required when DB_SSLMODE is verify-ca/verify-full')
      ctx = ssl.create_default_context(cafile=self.db_sslrootcert)
      ctx.check_hostname = mode == 'verify-full'
      ctx.verify_mode = ssl.CERT_REQUIRED
      return {'ssl': ctx}

    raise ValueError(f'Unsupported DB_SSLMODE: {self.db_sslmode}')


settings = Settings()

