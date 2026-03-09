from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.api.router import api_router
from app.core.config import settings


def getCorsOrigins () -> list[str]:
  raw = os.getenv('CORS_ORIGINS')
  if raw:
    return [x.strip() for x in raw.split(',') if x.strip()]
  return [
    'https://survey-all.ru',
    'https://www.survey-all.ru',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]


app = FastAPI(
  title='Anketka API',
  version='0.1.0',
  openapi_url=f'{settings.api_v1_prefix}/openapi.json',
  docs_url='/docs',
  redoc_url='/redoc',
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=getCorsOrigins(),
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)

