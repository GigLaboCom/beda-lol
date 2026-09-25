# Поправки к спецификации beda.giglabo.com

Поправки действуют поверх `07-spec-beda-giglabo.md`. Где поправка противоречит спецификации, права поправка. Живая версия — в конце документа https://claude.ai/code/artifact/764f380b-c599-4791-b2b6-23a497420d2d

## П-1. Supabase остаётся (23.09.2026)

База данных и авторизация — на Supabase; Go-бэкенд остаётся и ходит в базу напрямую, а токены пользователей проверяет сам.

| Что | Было в спецификации | Стало |
| --- | --- | --- |
| База | свой Postgres в контейнере на VPS | Postgres проекта Supabase; Go подключается через `pgx` |
| Схема и миграции | goose, `db/migrations`, встроены в `beda-api` | Supabase CLI, `supabase/migrations/*.sql`; sqlc читает схему оттуда; подкоманда `beda-api migrate` не нужна |
| Go-модуль | в корне репозитория (ради `go:embed` миграций) | снова в `apps/api`, как в исходной спецификации |
| Вход | своя реализация: GitHub OAuth, magic link, сессии в таблице | Supabase Auth: провайдер GitHub и magic link; сессия в cookie через `@supabase/ssr` на стороне Astro |
| Пользователи | `users`, `identities`, `sessions`, `magic_links` | `auth.users` от Supabase + `app.profiles` (`id` = `auth.users.id`, `display_name`, `role`, `trusted`) |
| Проверка в Go | cookie сессии + таблица `sessions` | `Authorization: Bearer <access token>`, подпись JWT проверяется локально по JWKS проекта; `iss`, `aud = authenticated`, `exp`; `sub` — id пользователя |
| Бот-защита входа | Turnstile в Go | встроенная поддержка Turnstile в Supabase Auth; для UGC-форм — по-прежнему проверка в Go |
| Письма | свой SMTP-провайдер из Go | собственный SMTP, подключённый в Supabase Auth; встроенная почта Supabase — только для тестов |
| Локальная разработка | `compose.dev`: Postgres + Mailpit | `supabase start`: Postgres, Auth и перехват писем; порты берутся из вывода CLI |
| Прод на VPS | caddy, web, api, postgres, backup | caddy, web, api, backup и маленький Postgres только для Umami |
| Бэкапы | ночной `pg_dump` своей базы | бэкапы Supabase по тарифу плюс наш ночной `pg_dump` в S3 как независимая копия |
| CI | Postgres в service-контейнере | локальный стек Supabase CLI в CI, только нужные сервисы |
| Деплой | `beda-api migrate up` перед выкатом | `supabase db push` из `deploy.yml` перед выкатом api и web; правило обратной совместимости миграций остаётся |

Правила, которые добавляются вместе с Supabase:

1. **Таблицы приложения — в схеме `app`, закрытой от Data API.** Ключ для браузера публичный, и всё, что открыто через Data API, доступно любому. Браузер использует supabase-js только для входа, все данные идут через Go. В схеме `public` своих таблиц не создаём. RLS включён на всех таблицах `app` с запретом по умолчанию — как второй рубеж.
2. **Роль пользователя — из `app.profiles`, не из токена.** Go кеширует профиль на 60 секунд. Первый админ назначается `beda-api admin promote <github-логин>`.
3. **Токен в Go передаётся заголовком.** Острова берут access token из supabase-js, Astro при рендере на сервере — из cookie через `@supabase/ssr`. Браузер не отправляет такой заголовок сам, поэтому классический CSRF для Go отпадает; проверку `Origin` оставляем.
4. **Подключение к базе:** session pooler (работает по IPv4, prepared statements в порядке) или прямое подключение, если у VPS есть IPv6. Transaction pooler — только с `default_query_exec_mode=simple_protocol` в pgx.
5. **Ключи.** Публичный ключ (publishable или anon) — во фронт. Секретный (secret или service_role) — только в `/opt/beda/.env` для Go, нужен для удаления аккаунта через Admin API. Никогда во фронт, в образы и в логи CI.
6. **Удаление аккаунта:** Go удаляет пользователя через Admin API; `app.profiles` уходит каскадом; у UGC-записей `author_id` обнуляется до удаления пользователя.
7. **Тариф.** Бесплатный проект засыпает при неактивности, для прода нужен платный. Лимиты, срок хранения бэкапов и доступность нужных функций проверить на момент подключения — условия меняются.
8. **Регион и персональные данные.** Своего региона в России у Supabase нет. Если аудитория российская и собираем почты, это конфликт с требованием хранить персональные данные в РФ. Выбор Supabase означает либо «аудитория не упирается в это требование», либо осознанный риск. Запасной путь — Supabase self-hosted на своём VPS: код почти не меняется, но эксплуатация тяжелее. Открытый вопрос про аудиторию теперь решает именно это.

Затронутые шаги для Claude Code: S01 (без `migrate`, модуль в `apps/api`), S02 (переписан под Supabase CLI), S04 (CI на Supabase CLI), S05 (прод без Postgres), S06 (`supabase db push`, бэкап из Supabase), в дорожной карте — S16–S19 (Supabase Auth вместо своей авторизации) и S21 (отдельный Postgres для Umami).

## П-2. Бэкенд на Rust вместо Go (23.09.2026)

API пишем на Rust: это язык, на котором уже написаны другие проекты автора, а нагрузка у сайта небольшая, так что выбор определяет удобство, а не производительность. Всё, что спецификация и П-1 говорят про Go-бэкенд по смыслу (маршруты, outbox, планировщик, проверка JWT, rate limit, правила UGC), остаётся — меняется реализация.

| Задача | Было (Go) | Стало (Rust) |
| --- | --- | --- |
| Каталог и сборка | `apps/api`, Go-модуль | `apps/api`, crate `beda-api`, `rust-toolchain.toml` с закреплённой стабильной версией |
| CLI | `flag`, подкоманды `serve`, `admin`, `healthcheck` | `clap` (derive), те же подкоманды + `version` |
| HTTP | `net/http` ServeMux | `axum` + `tower-http`: request id, трассировка, лимит тела 64 КБ, таймауты |
| Асинхронность | горутины | `tokio` |
| База | `pgx` + `sqlc` | `sqlx` с проверкой запросов при сборке (`query!`); офлайн-данные `.sqlx/` коммитятся; миграции — по-прежнему Supabase CLI |
| JWT Supabase | `golang-jwt` + JWKS | `jsonwebtoken` (ES256/RS256), JWKS загружается и кешируется через `reqwest` с `rustls` |
| Логи | `slog` | `tracing` + `tracing-subscriber`, JSON в проде |
| Ошибки | обёртки над `error` | `thiserror` для доменных ошибок, `anyhow` на верхнем уровне; единый формат ответа `{"error":{"code","message"}}` |
| Rate limit | `x/time/rate` | `governor` с ключом по IP и пользователю |
| Тесты | `go test` | `cargo test`; тесты с базой — на локальном стеке Supabase, каждый в транзакции с откатом |
| Качество | `golangci-lint` | `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo deny check` (лицензии, уязвимости, дубликаты) |
| Образ | distroless static | сборка на `rust:alpine` через `cargo-chef` (кеш зависимостей), статический бинарник под musl, финальный образ distroless static; `rustls` вместо OpenSSL |
| CI | кеш Go | `rust-cache`, установка `sqlx-cli` готовым бинарником, `cargo sqlx prepare --check` против локального Supabase |

Дополнительные правила:

1. **Запросы проверяются при сборке.** Любое изменение SQL сопровождается `cargo sqlx prepare`; CI падает, если `.sqlx/` устарел. Docker-сборка идёт с `SQLX_OFFLINE=true` и не ходит в базу.
2. **Пулер Supabase:** `sqlx` тоже использует prepared statements, поэтому правило П-1 о подключении (session pooler или прямое) действует без изменений.
3. **Никакого `unsafe`** в коде приложения (`#![forbid(unsafe_code)]`), `unwrap` и `expect` — только в тестах и при старте для заведомо корректной конфигурации.
4. **Архитектура образа:** по умолчанию `x86_64`; если VPS окажется на ARM, добавить цель `aarch64` в сборку образа.
5. **Общая логика с фронтом** остаётся на TypeScript. Движок «Шторма» можно позже вынести в отдельный crate и собрать в WASM для браузера — только если понадобится проверять результаты на сервере.

Затронутые шаги для Claude Code: S01 (каркас на axum), S02 (`sqlx` вместо `sqlc`), S04 (CI для Rust), S05 (Dockerfile с `cargo-chef`), упоминания Go-бэкенда в S06, S10, S11 и дорожной карте.
