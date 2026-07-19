# Деплой FitAI в продакшен

Гайд по запуску сайта в проде: база (MongoDB Atlas), безопасность и две схемы
развёртывания. Мобилка (`mobile/`) деплоится отдельно и здесь не рассматривается.

## Что деплоим

Три части:

| Часть | Порт (dev) | Роль | Публичность |
|-------|-----------|------|-------------|
| `web` | 5173 | React-фронт (статика после сборки) | публичный |
| `server` | 5000 | API Gateway (auth, CRUD, проксирование в AI) | публичный |
| `ai-service` | 5001 | Микросервис к LLM (промпты, ключ провайдера) | **внутренний** |

`ai-service` не должен смотреть в интернет — только `server` ходит в него по
`AI_SERVICE_URL`. Ключ AI-провайдера живёт только в `ai-service`.

---

## Шаг 1. База данных — MongoDB Atlas

1. Создай бесплатный кластер (M0) на https://www.mongodb.com/cloud/atlas
2. Database Access → добавь пользователя с паролем.
3. Network Access → добавь IP платформы деплоя (или `0.0.0.0/0` для старта).
4. Скопируй строку подключения `mongodb+srv://...` и добавь имя БД `/fitai`.

В `server` (env прода):
```
EMBEDDED_MONGO=false
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/fitai
```

## Шаг 2. Секреты и безопасность

Сгенерируй надёжный JWT-секрет:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> В проде `server` **не стартует**, если (`assertProdConfig` в `server/src/config.ts`):
> - `JWT_SECRET` остался дефолтным,
> - не задан `ALLOWED_ORIGINS`,
> - `EMBEDDED_MONGO=true`.
>
> Это защита от случайного небезопасного запуска. Уже включены: `helmet`,
> лимит тела 100kb, rate-limit (300/15мин общий, 20/15мин на `/auth`, 30/час на `/generate`).

---

## Схема A — один сервис (проще всего, рекомендуется для старта)

Gateway сам раздаёт собранный фронт. Один домен → **CORS не нужен**, фронт ходит
на относительный `/api`. Нужны 2 сервиса: `server` (публичный) + `ai-service` (внутренний).

**Сборка и запуск `server`:**
```bash
npm install
npm run build -w web        # собрать фронт в web/dist
npm run start -w server     # server отдаёт и API, и web/dist
```

**Env для `server`:**
```
NODE_ENV=production
JWT_SECRET=<сгенерированный секрет>
ALLOWED_ORIGINS=https://ваш-домен            # можно оставить пустым при SERVE_WEB, но лучше указать
EMBEDDED_MONGO=false
MONGO_URI=mongodb+srv://...
AI_SERVICE_URL=http://<внутренний-адрес-ai-service>:5001
SERVE_WEB=true
```

**Env для `ai-service`:**
```
AI_API_KEY=<ключ провайдера>
AI_BASE_URL=https://api.proxyapi.ru/openai/v1
AI_MODEL=gpt-4o-mini
```

Фронт при этой схеме `VITE_API_URL` **не задаёт** (пусто = относительный `/api`).

---

## Схема B — раздельно (статика на CDN + API отдельно)

Фронт на статик-хостинге (Vercel/Netlify/Cloudflare Pages), API — отдельный сервис.
Разные домены → **нужен CORS и `VITE_API_URL`**.

**Фронт** (`web`), env при сборке:
```
VITE_API_URL=https://api.ваш-домен      # без слэша на конце
```
Команда сборки: `npm run build -w web`, публиковать папку `web/dist`.

**API** (`server`), env:
```
NODE_ENV=production
JWT_SECRET=<секрет>
ALLOWED_ORIGINS=https://ваш-домен,https://www.ваш-домен
EMBEDDED_MONGO=false
MONGO_URI=mongodb+srv://...
AI_SERVICE_URL=http://<внутренний-ai-service>:5001
SERVE_WEB=false
```

**ai-service** — как в схеме A.

---

## Схема C — только фронт на GitHub Pages (без сервера)

Самый быстрый и бесплатный путь для демо. Веб-приложение работает полностью в браузере:
`web/src/api/local.ts` эмулирует API поверх `localStorage`. Данные пользователя —
у него в браузере, генерация тренировок и планов питания — по шаблонам (порт `ai-service/mock`).

Плюсы: без Atlas, без Render, без ключа AI, без CORS. Минус: генерация не LLM-ная,
данные не синхронизируются между устройствами (для этого — экспорт/импорт JSON на дашборде).

Пайплайн уже готов в `.github/workflows/deploy.yml`:

1. В `Settings → Pages` выбрать источник **GitHub Actions**.
2. Опционально задать `Settings → Variables → VITE_API_URL` — тогда фронт пойдёт на реальный
   бэкенд (схема B), иначе — статичный режим.
3. `git push origin main` → сайт публикуется на `https://<user>.github.io/<repo>/`.

Локальная проверка сборки под Pages:

```powershell
$env:VITE_BASE='/fitai/'; npm run build -w web
```

Плагин `pagesSpaFallback` (в `web/vite.config.ts`) кладёт `404.html` рядом с `index.html`,
чтобы deep-link `/workouts` не отдавал 404 после F5.

---

## Чеклист перед деплоем

- [ ] Кластер Atlas создан, `MONGO_URI` рабочий, `EMBEDDED_MONGO=false`
- [ ] `JWT_SECRET` сгенерирован и задан (не дефолтный)
- [ ] `NODE_ENV=production` на `server`
- [ ] `ALLOWED_ORIGINS` = реальные домены фронта (схема B — обязательно)
- [ ] Ключ AI задан в `ai-service`, сервис закрыт от внешнего доступа
- [ ] Схема A: `SERVE_WEB=true` + `npm run build -w web` перед стартом
- [ ] Схема B: `VITE_API_URL` задан при сборке фронта
- [ ] HTTPS включён на публичных доменах (обычно даёт платформа)
- [ ] `.env` файлы не в гите (уже в `.gitignore`)

## Проверка после деплоя

```bash
curl https://ваш-домен/api/health          # {"ok":true}
```
Открой сайт → зарегистрируйся → сгенерируй тренировку. Если AI в mock-режиме —
проверь `AI_API_KEY` в `ai-service`.

---

## Известные ограничения / что улучшить дальше

- **JWT в localStorage** (`web/src/api/client.ts`) — уязвим к XSS. Для повышенной
  безопасности перейти на httpOnly-cookie (потребует правок auth на сервере и клиенте).
- **ai-service без авторизации** — полагается на сетевую изоляцию (внутренний адрес).
  Если он доступен извне — добавить общий секрет между `server` и `ai-service`.
- Docker на машине разработки не используется (нестабилен) — платформы PaaS
  собирают из исходников, Dockerfile не требуется.
