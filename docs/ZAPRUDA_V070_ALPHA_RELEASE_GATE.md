# ZAPRUDA COMMUNITY v0.7.0 — закрытая Alpha / release gate

**Дата:** 2026-11-01. **Статус:** подготовка, публичный релиз не разрешён.

## Бесплатный стек

- GitHub: код, pull request, автоматические проверки.
- Supabase STAGING `yudtbifopfnjtjanaqrd`: Auth, PostgreSQL, Realtime. Не использовать production `sonvniuwtvzzyuglscah`.
- Render Free Web Service: контейнер `Dockerfile`, бесплатный HTTPS-домен `*.onrender.com`. Минусы: остановка после простоя, медленный холодный запуск, ресурсные лимиты. Не использовать бесплатную Render PostgreSQL для долговременных данных (срок её бесплатной базы ограничен).
- Без покупки домена, без переноса production, без оплаты SaaS.

## Проверенные факты

- Docker-сборка и три CI-джоба были зелёными до последней серии release-prep коммитов; проверить CI **последнего** коммита.
- В STAGING создано 5 основных таблиц: profiles, fishing_reports, reactions, angler_preferences, report_private_locations. Это частичная схема, а не все 61 production tables.
- Atomic reaction RPC находится только в STAGING, не в production. Не включать `VITE_ENABLE_ATOMIC_REACTIONS` до интеграционного теста с реальным тестовым пользователем.
- Разрешения гостя на точные координаты в STAGING проверены на уровне SQL-привилегий, но сценарии реального API/JWT еще не пройдены.

## Конфигурация

- Dockerfile собирает браузерный bundle на этапе **build**, поэтому публичные Supabase переменные должны быть доступны **при сборке**, не только на запуске.
- Обязательные build args: `VITE_SUPABASE_URL=https://yudtbifopfnjtjanaqrd.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY=<public-staging-key>`.
- Не использовать `sb_secret_`, `service_role`, production URL или пароли.
- `VITE_ENABLE_ATOMIC_REACTIONS=false` пока нет интеграционного теста.
- `HOST=0.0.0.0`, `PORT=3000`, здоровье: GET `/`. Зависимости в `bun.lock`.
- OAuth / email redirect URLs в настройках **STAGING Auth** необходимо настроить на конкретный проверенный `https://<name>.onrender.com`, избегать wildcard для production.

## До закрытого интернет-теста обязательно

1. Успешный CI текущего SHA (checks + frontend + Docker).
2. Staging Auth: подтверждение e-mail и корректный redirect, 2 изолированных тестовых пользователя.
3. Синтетический публичный рыболовный отчёт, реакции добавить → заменить → убрать, reload/Reatime; отдельный тест отказов.
4. Profile: редактирование → обновление страницы → сохранение, тест чужого профиля.
5. Проверка GET public reports у anon, а также запрета точных координат для anon/other-user, включая явный select=latitude,longitude и view/RPC.
6. Функции, для которых в STAGING нет таблиц/RPC/Storage, нельзя рекламировать как работающие. Скрывать неготовые формы от тестировщиков либо явно помечать их недоступными.
7. Не загружать настоящие координаты, фотографии пользователей, персональные данные или платежи в STAGING.
8. Включить доступ только небольшой группе приглашённых пользователей после прохождения проверок. Бесплатный URL не является защитой доступа: ограничивать тестовую группу на уровне Auth/приложения.

## Развёртывание

1. Выбрать/подтвердить владельцем рабочее пространство Render.
2. Создать сервис из **конкретной рабочей ветки**, не из main; Docker runtime.
3. Проверить способ передачи **build args** в текущей версии Render; не путать runtime env с build-time env. При необходимости использовать build-specific конфигурацию.
4. Запустить preview в бесплатном плане, не подключая production.
5. Проверить URL, redirect, вход, основные экраны; только затем передавать URL тестировщикам.

Не создавайте публичный сервис с рабочими логинами, пока условия выше не выполнены. Дизайн закреплён в docs/ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md — не менять.
