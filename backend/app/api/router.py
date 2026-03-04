from fastapi import APIRouter

from app.api.routes import auth, projects, team, users


api_router = APIRouter()
api_router.include_router(auth.router, prefix='/auth', tags=['Авторизация'])
api_router.include_router(users.router, prefix='/users', tags=['Пользователи'])
api_router.include_router(team.router, prefix='/team', tags=['Команда'])
api_router.include_router(projects.router, prefix='/projects', tags=['Проекты'])

