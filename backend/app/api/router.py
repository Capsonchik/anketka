from fastapi import APIRouter

from app.api.routes import auth, team, users


api_router = APIRouter()
api_router.include_router(auth.router, prefix='/auth', tags=['Авторизация'])
api_router.include_router(users.router, prefix='/users', tags=['Пользователи'])
api_router.include_router(team.router, prefix='/team', tags=['Команда'])

