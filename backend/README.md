## Backend (FastAPI + Postgres + Alembic)

### Что есть сейчас
- **FastAPI** со Swagger: `http://localhost:8000/docs`
- **JWT авторизация**: access + refresh
- **Эндпоинты**:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/users/me` (Bearer access token)
- **Postgres**: таблицы лежат в схеме **`users`** (это проще, чем отдельная БД “users”, но изолирует сущности пользователей в рамках твоей `anketka_db`)
- **Миграции**: Alembic (`backend/alembic/versions/...`)
- **Запуск**: через Docker Compose (в корне репо)

### Конфиг
Файл `backend/.env` уже создан для дев-режима и по умолчанию подключается к твоей локальной БД через:
- `DB_HOST=host.docker.internal`
- `DB_PORT=5432`
- `DB_USER=user`
- `DB_PASSWORD=admin`
- `DB_NAME=anketka_db`

Если Postgres крутится не на хосте, поменяй эти значения.

### Запуск
Из корня проекта:

```bash
docker compose up --build
```

При старте автоматически выполняется:
- `alembic upgrade head`
- запуск `uvicorn` с `--reload`

### Примеры запросов
Регистрация:

```bash
curl.exe -X POST http://localhost:8000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"firstName\":\"Иван\",\"lastName\":\"Иванов\",\"organization\":\"ООО Компания\",\"email\":\"user@example.com\",\"phone\":\"+79000000000\",\"password\":\"secret123\"}"
```

Получить текущего пользователя:

```bash
curl.exe http://localhost:8000/api/v1/users/me ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Дальше (логично следующим шагом)
- Подключить фронт к этим эндпоинтам (в `SignUpForm` сейчас нет запроса — только редирект).
- Добавить “one refresh token per device”/лимиты и чистку просроченных refresh-токенов.
- При желании вынести пользователей в отдельную БД (не схему) — тогда миграции и подключение будут отдельными.

