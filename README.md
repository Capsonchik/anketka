# Anketka

## Быстрый старт (Docker)

### 1) Создай `backend/.env`

Минимально нужны `SECRET_KEY` и `REFRESH_TOKEN_PEPPER`.

Пример (подключение к Postgres в Docker Compose профиле `db`):

```env
APP_ENV=dev
DB_HOST=postgres
DB_PORT=5432
DB_USER=user
DB_PASSWORD=admin
DB_NAME=anketka_db
SECRET_KEY=change-me
REFRESH_TOKEN_PEPPER=change-me-too
```

Если Postgres у тебя поднят локально на Windows, то для контейнера обычно нужен:
`DB_HOST=host.docker.internal`.

### 2) Поднять backend (+ опционально Postgres)

Только backend (если БД снаружи Docker):

```bash
docker compose up -d --build backend
docker compose logs -f backend
```

Backend + Postgres в Docker:

```bash
docker compose --profile db up -d --build
docker compose logs -f backend
```

Backend будет на `http://localhost:8000`, API префикс: `/api/v1`.

Остановить:

```bash
docker compose down
# или с удалением данных Postgres:
docker compose down -v
```

## Фронтенд (локально)

```bash
npm install
npm run dev
```

Frontend будет на `http://localhost:3000`.

## Backend (локально, без Docker)

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt

# задать переменные окружения (SECRET_KEY, REFRESH_TOKEN_PEPPER, DB_*)
# или создать backend/.env

alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
