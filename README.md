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
npm run dev          # поднять все три сервиса разом
```

Открой http://localhost:5173

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
