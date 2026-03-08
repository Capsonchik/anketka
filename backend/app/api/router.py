from fastapi import APIRouter

from app.api.routes import auth, projects, team, users, surveys, auditors, public_pa, price_monitoring, auditor_auth, auditor_portal


api_router = APIRouter()
api_router.include_router(auth.router, prefix='/auth', tags=['Авторизация'])
api_router.include_router(users.router, prefix='/users', tags=['Пользователи'])
api_router.include_router(team.router, prefix='/team', tags=['Команда'])
api_router.include_router(auditors.router, prefix='/auditors', tags=['Аудиторы'])
api_router.include_router(auditor_auth.router, prefix='/auditor-auth', tags=['Аудитор: авторизация'])
api_router.include_router(auditor_portal.router, prefix='/auditor', tags=['Аудитор'])
api_router.include_router(projects.router, prefix='/projects', tags=['Проекты'])
api_router.include_router(surveys.router, prefix='/surveys', tags=['Анкеты'])
api_router.include_router(public_pa.router, prefix='/public', tags=['Публичная анкета'])
api_router.include_router(price_monitoring.router, prefix='/price-monitoring', tags=['Ценовой мониторинг'])

