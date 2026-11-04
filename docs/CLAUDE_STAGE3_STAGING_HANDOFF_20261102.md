# Задание Claude: независимая проверка STAGING и безопасности ZAPRUDA

Дата: 2026-11-02. База кода: `SergeyGalkin91/zapruda1` ветка `release/v0.7.0-alpha`. **Никогда не рассматривать main как актуальную Alpha.**

## Что уже проверено
- STAGING project `yudtbifopfnjtjanaqrd` имеет 8 public tables: angler_preferences, fishing_reports, profiles, reactions, report_private_locations, social_threads, social_messages, social_message_reactions.
- STAGING пока НЕ имеет social_groups / social_group_members / partner_trips. Поэтому скрипт лимита 15 НЕЛЬЗЯ применять самостоятельно.
- PROD `sonvniuwtvzzyuglscah`: read-only сверено наличие колонок social_groups / social_group_members / partner_trips; **данные пользователей не копировать**.
- Действующая Draft PR #52 интегрирует SPOT / direct messages в Alpha; SQL RLS role simulation прошла, но E2E на реальных независимых JWT ещё не пройден.
- Security advisors: Leaked Password Protection WARN в обоих Supabase проектах; STAGING 1 authenticated-callable SECURITY DEFINER RPC, PROD 12. Никакой секрет/ключ не выписан и не ротирован.
- PR #49 оригинальный count-before-insert trigger без сериализации, подвержен гонке при конкурентном принятии заявок.
- В этом Draft PR есть **НЕПРИМЕНЁННЫЙ** SQL `supabase/staging/DRAFT_club_capacity_15_review_only.sql`: блокирует строку конкретного клуба, считает pending+accepted, закрывает попытки переполнения. Это черновик для ревью, НЕ готовая миграция.

## Просьба Claude — конкретные deliverables
1. На актуальном коде `release/v0.7.0-alpha` сделать inventory реальных frontend запросов к `social_groups`, `social_group_members`, `partner_trips`, `guide_profiles`, связанным tables/functions; назвать точные файлы и поля.
2. Подготовить **полный dependency-ordered и идемпотентный STAGING-only migration draft** для минимальной схемы, FK в `auth.users` и `profiles`, policy/grant/trigger review; без слепого копирования production, без real user data.
3. Проверить draft 15-slot trigger на конкуренцию, риски deadlock, RLS-влияние `SECURITY DEFINER`, владение функцией, `EXECUTE` grants, pending semantics, existing legacy triggers. Составить SQL QA test plan для 14→15 и попытки 16, включая параллельные транзакции.
4. Проверить аутентификацию/Auth SMTP для STAGING только после согласования тестового аккаунта; не считать письмо доставленным по одному audit log. Не публиковать SMTP пароли.
5. Ключи: сначала inventory **типов** ключей и мест использования, не выводя их значения. Ротация secret/service_role только с планом изменения клиентов и проверки доступа, отдельно согласовать production.

## Для релиза
- v0.7.1 MUST HAVE **СХОДКИ**: городские объявления → принятый отклик → приватная встреча до 3 человек, отдельная от КЛУБОВ. Полный источник: PR #53.
- CLUBS: 500 ₽ за создание, 15 max pending+accepted (уточнить учёт владельца), не имитировать платёж без серверного подтверждения.
- Не изменять `main` или PROD, не сливать PR автоматически. Сначала предоставить diff/миграции и результаты тестов.

## Документы
- PR #53: https://github.com/SergeyGalkin91/zapruda1/pull/53
- PR #52: https://github.com/SergeyGalkin91/zapruda1/pull/52
- PR #49: https://github.com/SergeyGalkin91/zapruda1/pull/49
