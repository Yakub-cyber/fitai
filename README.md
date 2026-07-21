# FitAI — AI-Тренер и Диетолог

Монорепозиторий (npm workspaces): бэкенд-микросервисы + веб на React. Один «мозг»
обслуживает и сайт, и будущее мобильное приложение.

## Структура

```
fitai/
├── ai-service/   AI-микросервис (порт 5001) — общается с DeepSeek, хранит промпты
│                 и Zod-схемы валидации. Без ключа работает в mock-режиме.
├── server/       API Gateway (порт 5000) — auth (JWT), CRUD тренировок/диет/дневника,
│                 MongoDB. Проксирует генерацию в ai-service.
├── web/          React + Vite (порт 5173) — лендинг, авторизация, дашборд,
│                 тренировки, AI-диетолог. Тёмная тема, skeleton-загрузка.
├── bot/          Telegram-бот на Telegraf (long-polling). Команды /workout,
│                 /diet, /weight, /stats. Линковка Telegram ↔ email через
│                 6-значный код из веба.
└── mobile/       React Native 0.86 (без Expo) — плеер тренировки с таймером
                  отдыха и отметками подходов, офлайн через AsyncStorage.
                  Вне npm-workspaces, свой install. См. mobile/README.md.
```

> `mobile/` намеренно вне workspaces (Metro плохо дружит с хойстингом). Установка
> и запуск — отдельно, изнутри папки: `cd mobile && npm install && npm run android`.
> Нужен нативный Android-тулчейн (JDK 17 + Android Studio).

## Быстрый старт

```bash
npm install          # установить зависимости всех пакетов (разово)
npm run dev          # поднять ai-service + server + web + bot разом
```

Открой http://localhost:5173

> Хочешь без бота (например токен ещё не получил) — `npm run dev:no-bot`.

> **MongoDB не нужно устанавливать.** Сервер использует встроенную `mongodb-memory-server`:
> при первом старте один раз докачивается бинарник mongod, данные сохраняются в
> `server/data/mongo` и переживают перезапуск. Docker не требуется.

### Запуск по отдельности

```bash
npm run dev:ai       # только AI-микросервис (5001)
npm run dev:server   # только API Gateway (5000)
npm run dev:web      # только веб (5173)
npm run typecheck    # проверка типов во всех пакетах
```

## AI-провайдер

Сервис работает с любым OpenAI-совместимым эндпоинтом. Настройка — в `ai-service/.env`:

```
AI_API_KEY=<ключ>
AI_BASE_URL=https://api.proxyapi.ru/openai/v1   # ProxyAPI (по умолчанию)
AI_MODEL=gpt-4o-mini
```

Другие варианты `AI_BASE_URL`/`AI_MODEL`: OpenAI (`https://api.openai.com/v1`),
DeepSeek (`https://api.deepseek.com`, модель `deepseek-chat`).

Если `AI_API_KEY` пустой — сервис отдаёт правдоподобные заглушки по той же
JSON-схеме, поэтому весь стек можно разрабатывать бесплатно.

## Переезд на внешнюю БД (например MongoDB Atlas)

В `server/.env`:

```
EMBEDDED_MONGO=false
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/fitai
```

## Telegram-бот

1. Возьми токен у `@BotFather` (`/newbot`).
2. Сгенерируй общий секрет: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. Впиши в `server/.env`:
   ```
   BOT_SHARED_SECRET=<секрет из шага 2>
   ```
4. Впиши в `bot/.env` (скопируй `bot/.env.example`):
   ```
   BOT_TOKEN=<токен из BotFather>
   BOT_SHARED_SECRET=<тот же секрет>
   API_URL=http://localhost:5000
   ```
5. `npm run dev` — бот стартует на long-polling, туннель наружу не нужен.
6. В Telegram: `/start`, потом привяжи аккаунт через `/link 123456`
   (код бери на сайте: авторизуйся → пока: `curl -X POST http://localhost:5000/api/telegram/link-code -H "Authorization: Bearer <твой JWT>"`;
   позже добавим кнопку в UI).

Команды бота: `/link <код>`, `/workout грудь пресс`, `/diet курица рис`,
`/weight 78.5`, `/stats`, `/open`, `/logout`.

## API (кратко)

| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/api/auth/register` · `/login` | Регистрация / вход, возвращает JWT |
| GET/PUT | `/api/auth/me` | Профиль пользователя |
| POST | `/api/workouts/generate` | Сгенерировать и сохранить тренировку |
| GET/DELETE | `/api/workouts` · `/api/workouts/:id` | Список / удаление тренировок |
| POST | `/api/diets/generate` | Сгенерировать и сохранить план питания |
| GET/DELETE | `/api/diets` · `/api/diets/:id` | Список / удаление планов |
| POST/GET | `/api/logs` | Дневник: запись веса / отметка тренировки |
| GET | `/api/logs/stats` | Сводка для дашборда |

Все роуты, кроме `auth`, требуют заголовок `Authorization: Bearer <token>`.

## Статичный режим (сайт без сервера, на GitHub Pages)

Веб-приложение умеет работать полностью в браузере: если `VITE_API_URL` не задан
при сборке, все вызовы `api()` идут в `web/src/api/local.ts` — «локальный бэкенд»
поверх `localStorage`, с тем же контрактом, что и настоящий gateway. Данные пользователя
живут в его браузере, генерация тренировок и планов питания — по шаблонам (порт mock-логики).

Полезно для демо/портфолио и когда бэкенд ещё не задеплоен. Переезд на реальный бэкенд
= задать `VITE_API_URL` при сборке.

Локальная проверка сборки под Pages:

```bash
# PowerShell
$env:VITE_BASE='/fitai/'; npm run build -w web
# затем открыть web/dist/index.html через любой статик-сервер
```

Деплой на GitHub Pages идёт автоматически по push в `main` — см. `.github/workflows/deploy.yml`.
На дашборде есть «Резервная копия» — экспорт/импорт JSON, чтобы перенести данные в другой браузер.
