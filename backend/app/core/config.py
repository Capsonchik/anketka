from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

  app_env: str = 'dev'

  db_host: str = 'localhost'
  db_port: int = 5432
  db_user: str = 'user'
  db_password: str = 'admin'
  db_name: str = 'anketka_db'

  secret_key: str
  access_token_expire_minutes: int = 15
  refresh_token_expire_days: int = 30
  refresh_token_pepper: str

  api_v1_prefix: str = '/api/v1'
  users_schema: str = 'users'

  @property
  def database_url_async(self) -> str:
    return (
      f'postgresql+asyncpg://{self.db_user}:{self.db_password}'
      f'@{self.db_host}:{self.db_port}/{self.db_name}'
    )


settings = Settings()

