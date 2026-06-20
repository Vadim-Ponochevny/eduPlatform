# EduPlatform

Backend-платформа для онлайн-курсов. Два микросервиса: **Main API** (NestJS) и **Image Worker** (Fastify).

## Архитектура

```
Teacher/Student
      │
      ▼
 Main API (NestJS :3000)
      ├── MongoDB      — пользователи, курсы, уроки
      ├── Redis        — кэш GET /courses и GET /courses/:id
      ├── Kafka        — асинхронная обработка изображений
      └── uploads/     — originals + processed

      Kafka topic: image.uploaded
              │
              ▼
 Image Worker (Fastify :3001)
      ├── Sharp        — сжатие + watermark
      ├── MongoDB      — обновление status: ready
      └── Kafka topic: image.processed
```

### Принятые решения

- **Main API на NestJS** — модульная структура, Guards для JWT и ролей, Swagger для тестирования без фронтенда.
- **Image Worker на Fastify** вместо Express — легковесный HTTP-сервер для health-check; основная логика в Kafka consumer.
- **MongoDB 4.4** в Docker — совместимость с CPU без AVX.
- **Redis** — кэш только для списка и деталей курсов; инвалидация при изменении курса, урока, записи студента.
- **Kafka** — два топика: `image.uploaded` (задача) и `image.processed` (подтверждение).
- Обработанные изображения сохраняются в `main-api/uploads/processed/` — Main API отдаёт их через `GET /images/:filename`.

## Структура репозитория

```
eduPlatform/
├── docker-compose.yml    # MongoDB, Redis, Kafka, Zookeeper
├── main-api/             # NestJS — бизнес-логика
├── image-worker/         # Fastify — обработка изображений
└── README.md
```

## Требования

- Node.js 18+
- Docker Desktop
- Git

## Запуск

### 1. Инфраструктура

Из корня проекта:

```bash
docker compose up -d
docker compose ps
```

Должны быть Up: `edu-mongodb`, `edu-redis`, `edu-kafka`, `edu-zookeeper`.

### 2. Main API

```bash
cd main-api
cp .env.example .env   # или создать .env вручную
npm install
npm run start:dev
```

Swagger: http://localhost:3000/api

Пример `main-api/.env`:

```env
MONGO_URI=mongodb://localhost:27017/eduplatform
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
KAFKA_BROKER=localhost:9092
PORT=3000
```

### 3. Image Worker

В **отдельном терминале**, после Main API:

```bash
cd image-worker
cp .env.example .env
npm install
npm run start:dev
```

Health-check: http://localhost:3001/health

Пример `image-worker/.env`:

```env
MONGO_URI=mongodb://localhost:27017/eduplatform
KAFKA_BROKER=localhost:9092
PROCESSED_DIR=../main-api/uploads/processed
WORKER_PORT=3001
```

## Тестирование (Swagger)

### Auth

1. `POST /auth/register` — создать teacher и student (`role`: `teacher` / `student`)
2. `POST /auth/login` — получить `access_token`
3. Нажать **Authorize** и вставить токен

### Курсы и уроки

| Действие | Эндпоинт | Кто |
|----------|----------|-----|
| Создать курс | `POST /courses` | teacher |
| Список курсов | `GET /courses` | все |
| Детали курса | `GET /courses/{id}` | все |
| Записаться | `POST /courses/{id}/enroll` | student |
| Добавить урок | `POST /courses/{courseId}/lessons` | teacher |
| Уроки курса | `GET /courses/{courseId}/lessons` | все |

### Загрузка и обработка изображений

1. Teacher: `POST /courses/{id}/cover` — выбрать файл (поле `file`)
2. Ответ: `{ "url": "....jpg", "status": "processing" }`
3. В терминале Worker: `Received task` → `Processed: ...`
4. `GET /courses/{id}` получаем `coverImage.status = "ready"`
5. `GET /images/{filename}` — отдать обработанную картинку (имя из `coverImage.url`)

Аналогично для урока: `POST /lessons/{id}/image`

### Redis-кэш

```bash
docker exec -it edu-redis redis-cli KEYS "courses:*"
```

- После `GET /courses` появляется `courses:list`
- После `GET /courses/{id}` — `courses:{id}`
- После `PATCH` курса или изменения урока ключи удаляются

### Kafka

```bash
docker exec -it edu-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic image.uploaded --from-beginning
docker exec -it edu-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic image.processed --from-beginning
```

## API-эндпоинты 

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Логин (JWT) |
| GET | `/courses` | Список курсов (кэш) |
| GET | `/courses/:id` | Детали курса (кэш) |
| POST | `/courses` | Создать курс |
| PATCH | `/courses/:id` | Обновить курс |
| DELETE | `/courses/:id` | Удалить курс |
| POST | `/courses/:id/enroll` | Запись студента |
| GET | `/courses/:courseId/lessons` | Уроки курса |
| POST | `/courses/:courseId/lessons` | Добавить урок |
| PATCH | `/lessons/:id` | Обновить урок |
| DELETE | `/lessons/:id` | Удалить урок |
| POST | `/courses/:id/cover` | Обложка курса |
| POST | `/lessons/:id/image` | Картинка урока |
| GET | `/images/:filename` | Обработанное изображение |

## Остановка

```bash
docker compose down
```
